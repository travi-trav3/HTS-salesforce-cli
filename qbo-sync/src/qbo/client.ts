import { loadConfig, QBO_BASE_URL, type Config } from '../config.js';
import { getPool } from '../db.js';
import { logger } from '../logger.js';
import type { QboInvoice, QboEntityChange } from './types.js';

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const MINOR_VERSION = '73';

interface TokenRow {
  access_token: string;
  refresh_token: string;
  access_expires_at: Date;
  refresh_expires_at: Date;
}

/**
 * Thin QBO Accounting API client. Handles OAuth access-token refresh
 * transparently and exposes the few read operations this service needs.
 * Tokens are persisted in the qbo_tokens table (seeded by `bin/qbo-authorize`).
 */
export class QboClient {
  private cfg: Config;
  private baseUrl: string;

  constructor(cfg: Config = loadConfig()) {
    this.cfg = cfg;
    this.baseUrl = QBO_BASE_URL[cfg.QBO_ENV];
  }

  private async loadTokens(): Promise<TokenRow> {
    const { rows } = await getPool().query<TokenRow>(
      `SELECT access_token, refresh_token, access_expires_at, refresh_expires_at
       FROM qbo_tokens WHERE realm_id = $1`,
      [this.cfg.QBO_REALM_ID],
    );
    const row = rows[0];
    if (!row) {
      throw new Error(
        `No QBO tokens for realm ${this.cfg.QBO_REALM_ID}. Run \`npm run qbo:authorize\` first.`,
      );
    }
    return row;
  }

  /** Return a valid access token, refreshing it if it expires within 60s. */
  private async accessToken(): Promise<string> {
    const row = await this.loadTokens();
    const expiresSoon = row.access_expires_at.getTime() - Date.now() < 60_000;
    if (!expiresSoon) return row.access_token;
    return this.refresh(row.refresh_token);
  }

  private async refresh(refreshToken: string): Promise<string> {
    const basic = Buffer.from(`${this.cfg.QBO_CLIENT_ID}:${this.cfg.QBO_CLIENT_SECRET}`).toString(
      'base64',
    );
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (!res.ok) {
      throw new Error(`QBO token refresh failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
    };
    const now = Date.now();
    await getPool().query(
      `UPDATE qbo_tokens SET access_token=$2, refresh_token=$3,
         access_expires_at=$4, refresh_expires_at=$5, updated_at=now()
       WHERE realm_id=$1`,
      [
        this.cfg.QBO_REALM_ID,
        json.access_token,
        json.refresh_token,
        new Date(now + json.expires_in * 1000),
        new Date(now + json.x_refresh_token_expires_in * 1000),
      ],
    );
    logger.info('refreshed QBO access token');
    return json.access_token;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const token = await this.accessToken();
    const url = `${this.baseUrl}/v3/company/${this.cfg.QBO_REALM_ID}/${path}`;
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}minorversion=${MINOR_VERSION}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`QBO GET ${path} failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  /** Run a QBO SQL-like query and return the named entity array. */
  private async query<T>(query: string, entity: string): Promise<T[]> {
    const encoded = encodeURIComponent(query);
    const json = await this.apiGet<{ QueryResponse?: Record<string, unknown> }>(
      `query?query=${encoded}`,
    );
    return ((json.QueryResponse?.[entity] as T[] | undefined) ?? []) as T[];
  }

  async getInvoice(id: string): Promise<QboInvoice | null> {
    const json = await this.apiGet<{ Invoice?: QboInvoice }>(`invoice/${id}`);
    return json.Invoice ?? null;
  }

  /**
   * Fetch every invoice that carries a given PO number in its custom field.
   * QBO does not allow querying custom fields directly, so we page through all
   * invoices and filter in memory. For HTS's volume this is fine; if it grows,
   * narrow with a TxnDate floor.
   */
  async getInvoicesByPoNumber(
    poNumber: string,
    matches: (inv: QboInvoice) => boolean,
  ): Promise<QboInvoice[]> {
    const out: QboInvoice[] = [];
    const pageSize = 1000;
    let start = 1;
    for (;;) {
      const page = await this.query<QboInvoice>(
        `SELECT * FROM Invoice STARTPOSITION ${start} MAXRESULTS ${pageSize}`,
        'Invoice',
      );
      out.push(...page.filter(matches));
      if (page.length < pageSize) break;
      start += pageSize;
    }
    logger.debug({ poNumber, count: out.length }, 'fetched invoices for PO');
    return out;
  }

  /** Change Data Capture: entities changed since an ISO timestamp. */
  async cdc(entities: string[], changedSince: string): Promise<QboEntityChange[]> {
    const json = await this.apiGet<{
      CDCResponse?: Array<{ QueryResponse?: Array<Record<string, unknown>> }>;
    }>(`cdc?entities=${entities.join(',')}&changedSince=${encodeURIComponent(changedSince)}`);

    const changes: QboEntityChange[] = [];
    for (const block of json.CDCResponse ?? []) {
      for (const qr of block.QueryResponse ?? []) {
        for (const [entityName, value] of Object.entries(qr)) {
          if (!Array.isArray(value)) continue; // skip startPosition/maxResults scalars
          for (const ent of value as Array<Record<string, unknown>>) {
            const meta = ent.MetaData as { LastUpdatedTime?: string } | undefined;
            changes.push({
              name: entityName,
              id: String(ent.Id ?? ''),
              operation: (ent.status as QboEntityChange['operation']) ?? 'Update',
              lastUpdated: meta?.LastUpdatedTime ?? new Date().toISOString(),
            });
          }
        }
      }
    }
    return changes;
  }
}
