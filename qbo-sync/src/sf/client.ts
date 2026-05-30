import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';
import { Connection } from 'jsforce';
import { loadConfig, type Config } from '../config.js';
import { logger } from '../logger.js';
import type { WorkOrderRecord } from '../domain/matcher.js';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Salesforce client using the JWT Bearer OAuth flow (server-to-server, no user
 * interaction, no refresh token). We sign a short-lived RS256 assertion with
 * the Connected App's private key and exchange it for an access token. The
 * matching public cert is uploaded to the Connected App; the SF_USERNAME user
 * is pre-authorized.
 */
export class SalesforceClient {
  private cfg: Config;
  private conn: Connection | null = null;
  private tokenExpiresAt = 0;

  constructor(cfg: Config = loadConfig()) {
    this.cfg = cfg;
  }

  private async buildAssertion(): Promise<string> {
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(
      JSON.stringify({
        iss: this.cfg.SF_CLIENT_ID,
        sub: this.cfg.SF_USERNAME,
        aud: this.cfg.SF_LOGIN_URL,
        exp: Math.floor(Date.now() / 1000) + 180,
      }),
    );
    const signingInput = `${header}.${claims}`;
    // Inline PEM (SF_JWT_KEY) takes precedence; otherwise read from file path.
    const key = this.cfg.SF_JWT_KEY ?? (await readFile(this.cfg.SF_JWT_KEY_PATH!, 'utf8'));
    const signature = createSign('RSA-SHA256').update(signingInput).sign(key);
    return `${signingInput}.${base64url(signature)}`;
  }

  /** Return a live jsforce Connection, exchanging a fresh JWT if needed. */
  private async connection(): Promise<Connection> {
    if (this.conn && Date.now() < this.tokenExpiresAt - 60_000) return this.conn;

    const assertion = await this.buildAssertion();
    const res = await fetch(`${this.cfg.SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      throw new Error(`SF JWT token exchange failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { access_token: string; instance_url: string };
    this.conn = new Connection({
      instanceUrl: json.instance_url,
      accessToken: json.access_token,
    });
    // SF access tokens via JWT have no fixed expiry in the response; assume the
    // org's session timeout and re-mint conservatively every 30 minutes.
    this.tokenExpiresAt = Date.now() + 30 * 60 * 1000;
    logger.info('minted Salesforce access token via JWT bearer');
    return this.conn;
  }

  /**
   * Open Work Orders carrying a PO number. Stage__c != 'Closed' is enforced
   * here so the matcher only ever sees live candidates.
   */
  async queryOpenWorkOrders(poNumber: string): Promise<WorkOrderRecord[]> {
    const conn = await this.connection();
    const escaped = poNumber.replace(/'/g, "\\'");
    const soql =
      `SELECT Id, Name, Stage__c, PO_Number__c FROM Project__c ` +
      `WHERE PO_Number__c = '${escaped}' AND Stage__c != 'Closed'`;
    const result = await conn.query<WorkOrderRecord>(soql);
    return result.records;
  }

  /** Cheap connectivity + auth check. Returns the org name and instance URL. */
  async verifyConnection(): Promise<{ orgName: string; instanceUrl: string }> {
    const conn = await this.connection();
    const res = await conn.query<{ Name: string }>('SELECT Id, Name FROM Organization LIMIT 1');
    return {
      orgName: res.records[0]?.Name ?? '(unknown)',
      instanceUrl: conn.instanceUrl,
    };
  }

  /** Every open Work Order carrying a non-blank PO number (for backfill). */
  async queryAllOpenPoWorkOrders(): Promise<WorkOrderRecord[]> {
    const conn = await this.connection();
    const soql =
      `SELECT Id, Name, Stage__c, PO_Number__c FROM Project__c ` +
      `WHERE Stage__c != 'Closed' AND PO_Number__c != null`;
    const result = await conn.query<WorkOrderRecord>(soql);
    return result.records;
  }

  /** Write the recomputed totals back to a Work Order. */
  async updateWorkOrderTotals(
    workOrderId: string,
    invoicedAmount: number,
    lastInvoiceDate: string | null,
  ): Promise<void> {
    const conn = await this.connection();
    await conn.sobject('Project__c').update({
      Id: workOrderId,
      Invoiced_Amount__c: invoicedAmount,
      Last_Invoice_Date__c: lastInvoiceDate,
    });
    logger.info({ workOrderId, invoicedAmount, lastInvoiceDate }, 'updated Work Order totals');
  }
}
