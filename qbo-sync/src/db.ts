import pg from 'pg';
import { loadConfig } from './config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: loadConfig().DATABASE_URL, max: 10 });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// --- system_meta helpers -----------------------------------------------------

export async function getMeta(key: string): Promise<string | null> {
  const { rows } = await getPool().query<{ value: string }>(
    'SELECT value FROM system_meta WHERE key = $1',
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await getPool().query(
    `INSERT INTO system_meta (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

export const META_RECONCILIATION_COMPLETED_AT = 'reconciliation_completed_at';
export const META_CDC_HIGH_WATER_MARK = 'cdc_high_water_mark';
