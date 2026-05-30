import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1),

  QBO_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  QBO_CLIENT_ID: z.string().min(1),
  QBO_CLIENT_SECRET: z.string().min(1),
  QBO_REALM_ID: z.string().min(1),
  QBO_WEBHOOK_VERIFIER_TOKEN: z.string().min(1),
  QBO_PO_FIELD_NAME: z.string().default('PO Number'),
  QBO_PO_FIELD_DEFINITION_ID: z.string().optional(),

  SF_LOGIN_URL: z.string().url().default('https://login.salesforce.com'),
  SF_CLIENT_ID: z.string().min(1),
  SF_USERNAME: z.string().min(1),
  // Provide the Connected App private key EITHER inline as PEM (SF_JWT_KEY,
  // best for Fly secrets) OR as a file path (SF_JWT_KEY_PATH, best for local).
  // Empty strings (a blank line in .env) are treated as "not set".
  SF_JWT_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  SF_JWT_KEY_PATH: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),

  OPS_ALERT_EMAIL: z.string().email().optional(),
  // Incoming-webhook URL for ops alerts (Slack/Discord/Teams compatible).
  // When unset, alerts are logged only.
  OPS_ALERT_WEBHOOK_URL: z.string().url().optional(),
  CDC_POLL_CRON: z.string().default('*/5 * * * *'),
  CDC_LOOKBACK_OVERLAP_SECONDS: z.coerce.number().int().nonnegative().default(60),
}).refine((c) => Boolean(c.SF_JWT_KEY ?? c.SF_JWT_KEY_PATH), {
  message: 'Provide the Salesforce JWT key via SF_JWT_KEY (inline PEM) or SF_JWT_KEY_PATH (file).',
  path: ['SF_JWT_KEY'],
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;

/**
 * Parse and validate process.env once. Throws a readable error listing every
 * missing/invalid variable, so a misconfigured deploy fails fast and loud
 * rather than erroring deep inside a request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Only memoize the default (process.env) path; explicit env args (tests)
  // always parse fresh.
  const useCache = env === process.env;
  if (useCache && cached) return cached;
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (useCache) cached = parsed.data;
  return parsed.data;
}

export const QBO_BASE_URL: Record<Config['QBO_ENV'], string> = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
};
