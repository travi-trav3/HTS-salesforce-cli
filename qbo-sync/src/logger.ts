import pino from 'pino';
import { loadConfig } from './config.js';

function level(): string {
  // Avoid throwing during early import if config is incomplete; default to info.
  try {
    return loadConfig().LOG_LEVEL;
  } catch {
    return process.env.LOG_LEVEL ?? 'info';
  }
}

export const logger = pino({
  level: level(),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["intuit-signature"]',
      '*.access_token',
      '*.refresh_token',
      '*.client_secret',
    ],
    censor: '[redacted]',
  },
});
