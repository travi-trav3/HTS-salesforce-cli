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
  SF_JWT_KEY_PATH: z.string().min(1),

  OPS_ALERT_EMAIL: z.string().email().optional(),
  CDC_POLL_CRON: z.string().default('*/5 * * * *'),
  CDC_LOOKBACK_OVERLAP_SECONDS: z.coerce.number().int().nonnegative().default(60),
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;

/**
 * Parse and validate process.env once. Throws a readable error listing every
 * missing/invalid variable, so a misconfigured deploy fails fast and loud
 * rather than erroring deep inside a request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (cached) return cached;
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const QBO_BASE_URL: Record<Config['QBO_ENV'], string> = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
};
