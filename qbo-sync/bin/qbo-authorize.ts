import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/config.js';
import { logger } from '../src/logger.js';
import { getPool, closePool } from '../src/db.js';

/**
 * One-time interactive QBO OAuth2 authorization-code flow. Run locally to seed
 * the qbo_tokens table for the configured realm. After this, the service
 * refreshes tokens on its own; you only re-run this if the refresh token
 * lapses (~100 days of inactivity) or the connection is revoked.
 *
 *   npm run qbo:authorize
 *
 * Opens a local callback listener on http://localhost:8088/callback — register
 * that exact URI in the Intuit app's Redirect URIs (for local authorization).
 */
const REDIRECT_URI = 'http://localhost:8088/callback';
const AUTH_BASE = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const SCOPE = 'com.intuit.quickbooks.accounting';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const state = randomBytes(16).toString('hex');

  const authUrl =
    `${AUTH_BASE}?client_id=${encodeURIComponent(cfg.QBO_CLIENT_ID)}` +
    `&response_type=code&scope=${encodeURIComponent(SCOPE)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

  logger.info('Open this URL in your browser to authorize QBO access:');
  // eslint-disable-next-line no-console
  console.log(`\n${authUrl}\n`);

  await new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '', REDIRECT_URI);
        if (!url.pathname.endsWith('/callback')) {
          res.writeHead(404).end();
          return;
        }
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const realmId = url.searchParams.get('realmId');
        if (returnedState !== state || !code || !realmId) {
          res.writeHead(400).end('State mismatch or missing code/realmId');
          reject(new Error('OAuth callback validation failed'));
          return;
        }

        const basic = Buffer.from(`${cfg.QBO_CLIENT_ID}:${cfg.QBO_CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
          }),
        });
        if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
        const t = (await tokenRes.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
          x_refresh_token_expires_in: number;
        };

        const now = Date.now();
        await getPool().query(
          `INSERT INTO qbo_tokens
             (realm_id, access_token, refresh_token, access_expires_at, refresh_expires_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (realm_id) DO UPDATE SET
             access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
             access_expires_at=EXCLUDED.access_expires_at,
             refresh_expires_at=EXCLUDED.refresh_expires_at, updated_at=now()`,
          [
            realmId,
            t.access_token,
            t.refresh_token,
            new Date(now + t.expires_in * 1000),
            new Date(now + t.x_refresh_token_expires_in * 1000),
          ],
        );

        logger.info({ realmId }, 'QBO tokens stored');
        res.writeHead(200).end('QBO authorized. You can close this tab.');
        server.close();
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    server.listen(8088, () => logger.info('listening on http://localhost:8088 for the OAuth callback'));
  });
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'authorization failed');
    await closePool();
    process.exit(1);
  });
