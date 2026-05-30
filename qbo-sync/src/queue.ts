import PgBoss from 'pg-boss';
import { loadConfig } from './config.js';
import { logger } from './logger.js';

export const SYNC_QUEUE = 'qbo-invoice-sync';
export const DEAD_LETTER_QUEUE = 'qbo-invoice-sync-dlq';

/** Payload enqueued per QBO entity change. */
export interface SyncJob {
  eventId: string;
  entity: { name: string; id: string; operation: string; lastUpdated: string };
  realmId: string;
}

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss({ connectionString: loadConfig().DATABASE_URL });
  boss.on('error', (err) => logger.error({ err }, 'pg-boss error'));
  await boss.start();
  return boss;
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}

/**
 * Retry/backoff policy for the sync worker. After the retries are exhausted
 * pg-boss moves the job to its failed state; we additionally mark the
 * webhook_events row dead_letter and alert ops.
 */
export const RETRY_POLICY = {
  retryLimit: 4,
  retryDelay: 60, // seconds; 1m base, then exponential via retryBackoff
  retryBackoff: true,
  deadLetter: DEAD_LETTER_QUEUE,
} as const;
