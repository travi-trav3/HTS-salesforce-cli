import type PgBoss from 'pg-boss';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { getPool, closePool } from './db.js';
import {
  getBoss,
  stopBoss,
  SYNC_QUEUE,
  DEAD_LETTER_QUEUE,
  type SyncJob,
} from './queue.js';
import { buildSyncPorts } from './ports.js';
import { processInvoiceChange } from './sync.js';
import { sendOpsAlert } from './notify.js';
import type { QboEntityChange } from './qbo/types.js';

async function handleSyncJob(job: PgBoss.Job<SyncJob>): Promise<void> {
  const { eventId, entity } = job.data;
  const pool = getPool();
  await pool.query(`UPDATE webhook_events SET status='processing', attempts=attempts+1 WHERE event_id=$1`, [
    eventId,
  ]);

  const change: QboEntityChange = {
    name: entity.name,
    id: entity.id,
    operation: entity.operation as QboEntityChange['operation'],
    lastUpdated: entity.lastUpdated,
  };

  try {
    const outcome = await processInvoiceChange(change, buildSyncPorts());
    await pool.query(
      `UPDATE webhook_events SET status='done', processed_at=now(), last_error=NULL WHERE event_id=$1`,
      [eventId],
    );
    logger.info({ eventId, outcome }, 'processed sync job');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await pool.query(`UPDATE webhook_events SET last_error=$2 WHERE event_id=$1`, [eventId, message]);
    logger.error({ eventId, err }, 'sync job failed; will retry per policy');
    throw err; // let pg-boss apply backoff / route to DLQ when exhausted
  }
}

async function handleDeadLetter(job: PgBoss.Job<SyncJob>): Promise<void> {
  const { eventId } = job.data;
  await getPool().query(
    `UPDATE webhook_events SET status='dead_letter', processed_at=now() WHERE event_id=$1`,
    [eventId],
  );
  logger.error({ eventId }, 'job exhausted retries -> dead_letter');
  await sendOpsAlert(
    'QBO sync: job dead-lettered',
    `Event ${eventId} failed all retries and was dead-lettered. Inspect webhook_events.last_error and replay with bin/replay-event once fixed.`,
  );
}

async function main(): Promise<void> {
  loadConfig();
  const boss = await getBoss();
  await boss.work<SyncJob>(SYNC_QUEUE, { batchSize: 1 }, async (jobs) => {
    for (const job of jobs) await handleSyncJob(job);
  });
  await boss.work<SyncJob>(DEAD_LETTER_QUEUE, { batchSize: 1 }, async (jobs) => {
    for (const job of jobs) await handleDeadLetter(job);
  });
  logger.info('sync worker started');
}

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    logger.info({ sig }, 'shutting down worker');
    Promise.allSettled([stopBoss(), closePool()]).then(() => process.exit(0));
  });
}

if (process.argv[1] && process.argv[1].endsWith('worker.js')) {
  main().catch((err) => {
    logger.fatal({ err }, 'worker failed to start');
    process.exit(1);
  });
}
