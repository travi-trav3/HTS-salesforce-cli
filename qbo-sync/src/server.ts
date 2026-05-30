import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { getPool, getMeta, META_RECONCILIATION_COMPLETED_AT } from './db.js';
import { verifyQboSignature } from './domain/hmac.js';
import { getBoss, SYNC_QUEUE, RETRY_POLICY, type SyncJob } from './queue.js';

interface QboWebhookBody {
  eventNotifications?: Array<{
    realmId: string;
    dataChangeEvent?: {
      entities?: Array<{ name: string; id: string; operation: string; lastUpdated: string }>;
    };
  }>;
}

export async function buildServer() {
  const cfg = loadConfig();
  // Capture the raw body so HMAC verification sees the exact bytes QBO signed.
  const app = Fastify({
    loggerInstance: logger,
    bodyLimit: 1_048_576,
  });

  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  app.get('/health', async () => {
    await getPool().query('SELECT 1');
    return { status: 'ok' };
  });

  app.post('/webhook/qbo', async (req, reply) => {
    const raw = req.body as Buffer;
    const signature = req.headers['intuit-signature'] as string | undefined;

    if (!verifyQboSignature(raw, signature, cfg.QBO_WEBHOOK_VERIFIER_TOKEN)) {
      logger.warn('rejected webhook with invalid signature');
      return reply.code(401).send({ error: 'invalid signature' });
    }

    let payload: QboWebhookBody;
    try {
      payload = JSON.parse(raw.toString('utf8')) as QboWebhookBody;
    } catch {
      return reply.code(400).send({ error: 'invalid json' });
    }

    const pool = getPool();
    const boss = await getBoss();

    for (const note of payload.eventNotifications ?? []) {
      for (const entity of note.dataChangeEvent?.entities ?? []) {
        // Idempotency key: entity + its lastUpdated. Replays are no-ops.
        const eventId = `wh:${entity.name}:${entity.id}:${entity.lastUpdated}`;
        const inserted = await pool.query(
          `INSERT INTO webhook_events (event_id, source, realm_id, payload, status)
           VALUES ($1, 'webhook', $2, $3, 'pending')
           ON CONFLICT (event_id) DO NOTHING`,
          [eventId, note.realmId, JSON.stringify(entity)],
        );
        if (inserted.rowCount === 0) continue; // already seen

        const job: SyncJob = { eventId, entity, realmId: note.realmId };
        await boss.send(SYNC_QUEUE, job, RETRY_POLICY);
      }
    }

    // Always 200 fast — QBO times out webhook responses in ~3s. The heavy work
    // happens in the worker, decoupled from QBO's retry budget.
    return reply.code(200).send({ received: true });
  });

  return app;
}

async function main(): Promise<void> {
  const cfg = loadConfig();

  // Refuse to serve until the one-time reconciliation backfill has run, so we
  // never start from a partial-data state.
  const reconciled = await getMeta(META_RECONCILIATION_COMPLETED_AT);
  if (!reconciled && cfg.NODE_ENV === 'production') {
    logger.fatal(
      'reconciliation has not run — refusing to start. Run `npm run reconcile -- --apply` first.',
    );
    process.exit(1);
  }

  const app = await buildServer();
  await app.listen({ host: '0.0.0.0', port: cfg.PORT });
  logger.info({ port: cfg.PORT }, 'webhook server listening');
}

// Only auto-start when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  main().catch((err) => {
    logger.fatal({ err }, 'server failed to start');
    process.exit(1);
  });
}
