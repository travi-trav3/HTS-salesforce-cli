import { loadConfig } from './config.js';
import { logger } from './logger.js';
import {
  getPool,
  closePool,
  getMeta,
  setMeta,
  META_CDC_HIGH_WATER_MARK,
} from './db.js';
import { getBoss, stopBoss, SYNC_QUEUE, RETRY_POLICY, type SyncJob } from './queue.js';
import { QboClient } from './qbo/client.js';

/**
 * Fallback for missed webhooks. Every CDC_POLL_CRON tick, ask QBO for every
 * Invoice changed since the high-water mark (minus an overlap to absorb clock
 * skew), enqueue anything not already seen, then advance the mark only on
 * success. Idempotency in webhook_events / processed_entities makes the
 * overlap harmless.
 */
export async function runCdcPoll(): Promise<{ enqueued: number; scanned: number }> {
  const cfg = loadConfig();
  const qbo = new QboClient(cfg);
  const pool = getPool();
  const boss = await getBoss();

  const markIso = await getMeta(META_CDC_HIGH_WATER_MARK);
  // First run: look back 5 minutes. QBO CDC supports up to 30 days.
  const since = markIso ? new Date(markIso) : new Date(Date.now() - 5 * 60_000);
  const overlapped = new Date(since.getTime() - cfg.CDC_LOOKBACK_OVERLAP_SECONDS * 1000);
  const changedSince = overlapped.toISOString();

  const changes = await qbo.cdc(['Invoice'], changedSince);
  let enqueued = 0;

  for (const change of changes) {
    // Per-(entity,lastUpdated) idempotency for the CDC path, which has no
    // native event id.
    const ins = await pool.query(
      `INSERT INTO processed_entities (entity_type, entity_id, last_updated)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [change.name, change.id, change.lastUpdated],
    );
    if (ins.rowCount === 0) continue;

    const eventId = `cdc:${change.name}:${change.id}:${change.lastUpdated}`;
    await pool.query(
      `INSERT INTO webhook_events (event_id, source, realm_id, payload, status)
       VALUES ($1, 'cdc_poll', $2, $3, 'pending') ON CONFLICT (event_id) DO NOTHING`,
      [eventId, cfg.QBO_REALM_ID, JSON.stringify(change)],
    );
    const job: SyncJob = { eventId, entity: change, realmId: cfg.QBO_REALM_ID };
    await boss.send(SYNC_QUEUE, job, RETRY_POLICY);
    enqueued += 1;
  }

  // Advance the mark only after a fully successful scan+enqueue.
  await setMeta(META_CDC_HIGH_WATER_MARK, new Date().toISOString());
  logger.info({ changedSince, scanned: changes.length, enqueued }, 'cdc poll complete');
  return { enqueued, scanned: changes.length };
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const boss = await getBoss();
  // Schedule the recurring poll via pg-boss cron, so exactly one instance runs
  // it even if multiple workers are deployed.
  await boss.schedule('cdc-poll', cfg.CDC_POLL_CRON);
  await boss.work('cdc-poll', async () => {
    await runCdcPoll();
  });
  logger.info({ cron: cfg.CDC_POLL_CRON }, 'cdc poller scheduled');
}

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    Promise.allSettled([stopBoss(), closePool()]).then(() => process.exit(0));
  });
}

if (process.argv[1] && process.argv[1].endsWith('cdc-poller.js')) {
  main().catch((err) => {
    logger.fatal({ err }, 'cdc poller failed to start');
    process.exit(1);
  });
}
