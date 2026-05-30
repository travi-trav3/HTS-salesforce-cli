import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

// A complete, valid base environment. Individual tests override fields.
function baseEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgres://u:p@localhost:5432/db',
    QBO_CLIENT_ID: 'cid',
    QBO_CLIENT_SECRET: 'secret',
    QBO_REALM_ID: '123',
    QBO_WEBHOOK_VERIFIER_TOKEN: 'tok',
    SF_CLIENT_ID: 'sfcid',
    SF_USERNAME: 'qbo-sync@example.com',
    SF_JWT_KEY_PATH: './secrets/sf-jwt.key',
  };
}

describe('loadConfig SF JWT key validation', () => {
  it('accepts a file path', () => {
    const cfg = loadConfig({ ...baseEnv() });
    expect(cfg.SF_JWT_KEY_PATH).toBe('./secrets/sf-jwt.key');
  });

  it('accepts an inline PEM and ignores a blank path', () => {
    const cfg = loadConfig({ ...baseEnv(), SF_JWT_KEY_PATH: '', SF_JWT_KEY: '-----BEGIN KEY-----' });
    expect(cfg.SF_JWT_KEY).toContain('BEGIN KEY');
    expect(cfg.SF_JWT_KEY_PATH).toBeUndefined();
  });

  it('treats a blank inline key as not set (empty string -> undefined)', () => {
    const cfg = loadConfig({ ...baseEnv(), SF_JWT_KEY: '' });
    expect(cfg.SF_JWT_KEY).toBeUndefined();
  });

  it('rejects when neither key source is provided', () => {
    const env = { ...baseEnv(), SF_JWT_KEY_PATH: '', SF_JWT_KEY: '' };
    expect(() => loadConfig(env)).toThrow(/SF_JWT_KEY/);
  });

  it('lists every missing required variable', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
