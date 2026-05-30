import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPool, closePool } from '../src/db.js';
import { logger } from '../src/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

/**
 * Apply every .sql file in migrations/ in lexical order, once. A
 * schema_migrations ledger tracks what has run so re-invocation is a no-op.
 * Each file runs inside its own transaction.
 */
async function main(): Promise<void> {
  const pool = getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ file }, 'migration already applied, skipping');
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info({ file }, 'migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ file, err }, 'migration failed; rolled back');
      throw err;
    } finally {
      client.release();
    }
  }
  logger.info('migrations complete');
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'migration run failed');
    await closePool();
    process.exit(1);
  });
