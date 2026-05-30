# hts-qbo-sync

QuickBooks Online → Salesforce invoice sync middleware for HTS Workforce.

When an invoice changes in QBO, this service re-sums the invoiced total for the
invoice's PO and writes `Invoiced_Amount__c` + `Last_Invoice_Date__c` onto the
matching Salesforce Work Order (`Project__c`). Salesforce's own flow
(`PO_Low_Balance_Alert`) then fires the low-balance notification and writes the
`PO_Alert_Log__c` audit row. **This service does not compute thresholds or send
alerts** — it only keeps the two invoice fields accurate.

## Architecture

```
QBO webhook ──► POST /webhook/qbo  (Fastify, "web" process)
                 │  1. verify HMAC-SHA256 signature
                 │  2. INSERT webhook_events (idempotent on event id)
                 │  3. enqueue pg-boss job
                 └► 200 OK in <50ms   (QBO times out at ~3s)

pg-boss queue ──► worker process
                   │  re-query QBO for the PO's current invoices
                   │  recompute (cumulative; voids & non-USD handled)
                   │  match to exactly one open Work Order, or needs_attention
                   │  write totals to Salesforce
                   └► retry 1m/5m/30m/2h, then dead_letter + ops alert

CDC poller ──► every 5 min ("cdc" process)
                fallback for missed webhooks; advances a high-water mark
```

The pure decision logic (`src/domain/`) and the orchestration (`src/sync.ts`)
are fully unit-tested with no external dependencies — see `tests/`.

## Key design decisions

- **Cumulative re-sum from source.** Every event re-pulls the PO's current
  invoices from QBO and re-totals. Replays, voids, and out-of-order events all
  self-heal because QBO is the source of truth, not the webhook payload.
- **Exactly one open match or fail.** A PO that matches zero or 2+ open Work
  Orders goes to `needs_attention` for a human; we never auto-pick a winner.
- **Accept-and-enqueue.** The webhook endpoint persists + enqueues and returns
  immediately, decoupling QBO's retry budget from Salesforce availability.
- **Reconciliation gate.** The server refuses to start in production until the
  one-time backfill (`bin/reconcile.ts --apply`) has run.
- **JWT Bearer auth to Salesforce.** Server-to-server; no user click, no
  refresh token. Runs as the dedicated `qbo-sync@…` integration user.
- **Sandbox first.** Build and validate against the QBO sandbox; flip
  `QBO_ENV=production` only after an end-to-end sandbox→SF test passes.

## Local development

```bash
cp .env.example .env          # fill in sandbox credentials
docker compose up -d db       # or point DATABASE_URL at any Postgres
npm install
npm run migrate               # create tables
npm run qbo:authorize         # one-time: seed QBO OAuth tokens (sandbox)
npm test                      # 33 unit tests, no credentials needed
npm run dev:server            # webhook server with reload
npm run dev:worker            # queue worker
npm run dev:cdc               # CDC poller
```

## Required environment

See `.env.example` for the full list. Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres (app tables + pg-boss) |
| `QBO_ENV` | `sandbox` \| `production` |
| `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` / `QBO_REALM_ID` | QBO app + company |
| `QBO_WEBHOOK_VERIFIER_TOKEN` | HMAC verification |
| `QBO_PO_FIELD_NAME` / `QBO_PO_FIELD_DEFINITION_ID` | which custom field holds the PO |
| `SF_LOGIN_URL` / `SF_CLIENT_ID` / `SF_USERNAME` / `SF_JWT_KEY_PATH` | Salesforce JWT bearer |
| `OPS_ALERT_EMAIL` | where technical-failure alerts go |

## Deploying to Fly.io

```bash
fly launch --no-deploy            # or `fly apps create hts-qbo-sync`
fly secrets set \
  DATABASE_URL=... QBO_CLIENT_ID=... QBO_CLIENT_SECRET=... QBO_REALM_ID=... \
  QBO_WEBHOOK_VERIFIER_TOKEN=... SF_CLIENT_ID=... SF_USERNAME=... \
  OPS_ALERT_EMAIL=...
# Upload the SF JWT private key as a secret file or bake via `fly secrets`.
fly deploy
```

Migrations run automatically on each release via `release_command` in
`fly.toml`. Three process groups (`web`, `worker`, `cdc`) run from one image.

## Go-live sequence

1. Deploy with `QBO_ENV=sandbox`. Run `npm run qbo:authorize`.
2. `npm run reconcile` (dry-run) → review the CSV in `reports/` with Amanda.
3. `npm run reconcile -- --apply` → backfills SF and opens the reconciliation gate.
4. Register the webhook URL in the QBO sandbox; run an end-to-end test.
5. Flip `QBO_ENV=production`, re-authorize against the production realm,
   re-run reconcile `--apply`, register the production webhook. Go live.

## This is a staging copy

The code currently lives in the `qbo-sync/` subdirectory of the
`HTS-salesforce-cli` repo for convenience. Before go-live it should be
extracted to its own repo (`hts-qbo-sync`). To preserve history:

```bash
git subtree split --prefix=qbo-sync -b qbo-sync-only
# then push that branch to the new repo's main
```

See `RUNBOOK.md` for operational procedures (token rotation, replaying
dead-lettered events, resolving needs_attention).
