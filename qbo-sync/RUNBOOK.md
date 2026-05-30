# hts-qbo-sync — Operational Runbook

Procedures for keeping the QBO→Salesforce sync healthy. Written so that someone
other than the original author can operate it.

## Access

- **Hosting:** Fly.io. App: `hts-qbo-sync`.
- **Recovery path:** if the primary operator is unreachable, the Fly org owner
  email can reset access. Confirm who reads that inbox and where the 2FA backup
  codes are stored (password manager or the inbox itself) — record it here:
  - Fly org owner email: `__________`
  - 2FA backup codes location: `__________`
- **Secrets** live only in Fly (`fly secrets list` shows names, not values) and
  in the QBO/Salesforce admin consoles. None are in the repo.

## Health & observability

```bash
fly status                      # machine + process health
fly logs                        # live logs (web/worker/cdc)
fly logs --process worker       # one process group
curl https://<app>.fly.dev/health
```

Useful SQL (via `fly postgres connect` or any psql):

```sql
-- backlog
SELECT status, count(*) FROM webhook_events GROUP BY status;
-- recent failures
SELECT event_id, attempts, last_error FROM webhook_events
  WHERE status IN ('dead_letter') ORDER BY received_at DESC LIMIT 20;
-- unresolved business cases for Amanda
SELECT * FROM needs_attention WHERE resolved_at IS NULL ORDER BY created_at;
-- CDC progress
SELECT value FROM system_meta WHERE key='cdc_high_water_mark';
```

## Common procedures

### A dead-lettered event
Symptom: ops alert "job dead-lettered", row in `webhook_events` with
`status='dead_letter'`.
1. Read `last_error` for that `event_id`.
2. Fix the root cause (e.g. SF field perms, expired token).
3. Replay: set the row back to pending and re-enqueue. (A `bin/replay-event`
   helper is the intended tool; until then, re-insert the pg-boss job manually
   or re-trigger via the CDC poller, which will re-detect the change.)

### needs_attention queue (business cases)
These are Amanda's to resolve, not technical failures:
- `missing_po` — invoice had no PO custom field. Ask Mary to populate it.
- `no_match` — PO doesn't match any open Work Order. Create/adjust the WO.
- `ambiguous_match` — 2+ open WOs share the PO. Close the wrong one or fix POs.
- `non_usd` — invoice in a non-USD currency. Manual reconciliation.
After fixing in QBO/SF, the next change event reprocesses; mark the row
`resolved_at = now()`.

### QBO token expired / connection revoked
Symptom: `QBO token refresh failed` in logs. The refresh token lapses after
~100 days of inactivity, or if someone disconnects the app in QBO.
Fix: re-run the authorization flow locally against the live realm:
```bash
npm run qbo:authorize
```

### Salesforce JWT auth failing
Symptom: `SF JWT token exchange failed`.
Check, in order: the integration user is active and pre-authorized on the
Connected App; the private key in `SF_JWT_KEY_PATH` matches the uploaded cert;
`SF_LOGIN_URL` is correct (login vs test). Rotate the cert if needed and
re-upload the public key to the Connected App.

### Re-running reconciliation
Safe to re-run any time (idempotent — it overwrites totals from source):
```bash
npm run reconcile            # dry-run, writes reports/reconcile-<ts>.csv
npm run reconcile -- --apply # writes to SF and sets the reconciliation gate
```

## Credential rotation schedule

| Credential | Cadence | How |
|---|---|---|
| SF JWT key/cert | ~yearly | regenerate keypair, upload public cert, update `SF_JWT_KEY_PATH` secret |
| QBO OAuth | as needed (~100-day inactivity) | `npm run qbo:authorize` |
| QBO webhook verifier token | on suspected leak | rotate in Intuit app, update `QBO_WEBHOOK_VERIFIER_TOKEN` secret |
| Fly API token | on operator change / leak | `fly tokens revoke` + reissue |

## TODO before go-live
- [ ] Wire `sendOpsAlert` to a real channel (email/Slack); it currently only logs.
- [ ] Add `bin/replay-event.ts` for one-command dead-letter replay.
- [ ] Migrate from a personal Fly account to an HTS-owned Fly org.
- [ ] Fill in the access/recovery blanks at the top of this file.
