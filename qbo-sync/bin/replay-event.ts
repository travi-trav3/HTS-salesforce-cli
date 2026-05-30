import { loadConfig } from '../src/config.js';
import { logger } from '../src/logger.js';
import { getPool, closePool } from '../src/db.js';
import { getBoss, stopBoss, SYNC_QUEUE, RETRY_POLICY, type SyncJob } from '../src/queue.js';

/**
 * Re-enqueue a webhook_events row for processing. Use after fixing the root
 * cause of a dead-lettered (or stuck) event.
 *
 *   npm run replay -- <event_id>
 *   npm run replay -- --all-dead-letter
 *
 * Resets the row to 'pending', clears attempts/last_error, and sends a fresh
 * pg-boss job built from the stored payload. Idempotency in the worker means a
 * replay of an already-correct event simply recomputes the same totals.
 */
interface EventRow {
  event_id: string;
  realm_id: string;
  payload: { name: string; id: string; operation: string; lastUpdated: string };
}

async function replayOne(row: EventRow): Promise<void> {
  const pool = getPool();
  const boss = await getBoss();
  await pool.query(
    `UPDATE webhook_events SET status='pending', attempts=0, last_error=NULL, processed_at=NULL
     WHERE event_id=$1`,
    [row.event_id],
  );
  const job: SyncJob = {
    eventId: row.event_id,
    entity: row.payload,
    realmId: row.realm_id,
  };
  await boss.send(SYNC_QUEUE, job, RETRY_POLICY);
  logger.info({ eventId: row.event_id }, 'replayed event');
}

async function main(): Promise<void> {
  loadConfig();
  const args = process.argv.slice(2);
  const pool = getPool();

  let rows: EventRow[];
  if (args.includes('--all-dead-letter')) {
    const res = await pool.query<EventRow>(
      `SELECT event_id, realm_id, payload FROM webhook_events WHERE status='dead_letter'`,
    );
    rows = res.rows;
    logger.info({ count: rows.length }, 'replaying all dead-lettered events');
  } else {
    const eventId = args[0];
    if (!eventId) {
      logger.error('usage: npm run replay -- <event_id> | --all-dead-letter');
      process.exit(2);
    }
    const res = await pool.query<EventRow>(
      `SELECT event_id, realm_id, payload FROM webhook_events WHERE event_id=$1`,
      [eventId],
    );
    if (res.rows.length === 0) {
      logger.error({ eventId }, 'no such event_id in webhook_events');
      process.exit(1);
    }
    rows = res.rows;
  }

  for (const row of rows) await replayOne(row);
  logger.info({ replayed: rows.length }, 'replay complete');
}

main()
  .then(() => Promise.allSettled([stopBoss(), closePool()]))
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'replay failed');
    await Promise.allSettled([stopBoss(), closePool()]);
    process.exit(1);
  });
