import { loadConfig } from '../src/config.js';
import { getPool, closePool, getMeta, META_RECONCILIATION_COMPLETED_AT } from '../src/db.js';
import { QboClient } from '../src/qbo/client.js';
import { SalesforceClient } from '../src/sf/client.js';

/**
 * Verify every credential and connection BEFORE attempting a real sync.
 * Turns "why isn't it working" into a labeled checklist. Read-only: makes no
 * changes to QBO or Salesforce. Run after filling in .env:
 *
 *   npm run preflight
 */
type Check = { name: string; run: () => Promise<string> };

const green = (s: string) => `\x1b[32m[PASS]\x1b[0m ${s}`;
const red = (s: string) => `\x1b[31m[FAIL]\x1b[0m ${s}`;

async function main(): Promise<void> {
  // loadConfig throws a readable list if any env var is missing/invalid.
  let cfg;
  try {
    cfg = loadConfig();
    console.log(green('config: all required environment variables present and valid'));
  } catch (err) {
    console.log(red('config: ' + (err instanceof Error ? err.message : String(err))));
    process.exit(1);
  }

  const sf = new SalesforceClient(cfg);
  const qbo = new QboClient(cfg);

  const checks: Check[] = [
    {
      name: 'postgres',
      run: async () => {
        await getPool().query('SELECT 1');
        return 'connected';
      },
    },
    {
      name: 'salesforce (JWT bearer)',
      run: async () => {
        const { orgName, instanceUrl } = await sf.verifyConnection();
        return `authenticated as ${cfg.SF_USERNAME} → "${orgName}" (${instanceUrl})`;
      },
    },
    {
      name: 'salesforce Work Order access',
      run: async () => {
        const wos = await sf.queryAllOpenPoWorkOrders();
        return `queried Project__c — ${wos.length} open WO(s) with a PO number`;
      },
    },
    {
      name: `quickbooks (${cfg.QBO_ENV})`,
      run: async () => {
        const company = await qbo.getCompanyName();
        return `connected to realm ${cfg.QBO_REALM_ID} → "${company}"`;
      },
    },
    {
      name: 'reconciliation gate',
      run: async () => {
        const at = await getMeta(META_RECONCILIATION_COMPLETED_AT);
        return at
          ? `set (last run ${at}) — server may start`
          : 'NOT set — run `npm run reconcile -- --apply` before starting in production';
      },
    },
  ];

  let failed = 0;
  for (const check of checks) {
    try {
      const detail = await check.run();
      console.log(green(`${check.name}: ${detail}`));
    } catch (err) {
      failed += 1;
      console.log(red(`${check.name}: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  await closePool();
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed. See RUNBOOK.md for fixes.`);
    process.exit(1);
  }
  console.log('\nAll preflight checks passed.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await closePool();
  process.exit(1);
});
