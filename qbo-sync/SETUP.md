# Setup guide — hts-qbo-sync

Step-by-step for the parts that need a human (account creation, OAuth consent,
secrets). Do them in this order. Everything else (code, migrations, checks) is
automated by the scripts called out below.

**Where do I type these commands?** In the **Terminal app on your Mac**, inside
the project folder. Open Terminal, then:

```bash
cd ~/HTS-salesforce-cli/qbo-sync     # or wherever you cloned it
```

`fly ...` commands talk to Fly.io. `npm run ...` commands run the app's tooling.

---

## Phase 0 — Install tools (one time)

```bash
# Fly CLI
brew install flyctl          # macOS with Homebrew
# (no Homebrew? run:  curl -L https://fly.io/install.sh | sh )

fly version                  # confirm it installed
fly auth login               # opens a browser; log in (or sign up)
```

Get your org slug and send it to Claude:

```bash
fly orgs list
```

The **Slug** column (e.g. `personal` or `hts-operations`) is what goes in
`fly.toml`. It is not a secret.

---

## Phase 1 — Salesforce Connected App (JWT Bearer)

### 1a. Generate the key pair (in Terminal)

```bash
mkdir -p secrets
openssl genrsa -out secrets/sf-jwt.key 2048
openssl req -new -x509 -key secrets/sf-jwt.key -out secrets/sf-jwt.crt \
  -days 730 -subj "/CN=hts-qbo-sync"
```

This makes a private key (`secrets/sf-jwt.key`, stays secret, already
gitignored) and a public cert (`secrets/sf-jwt.crt`, gets uploaded next).

### 1b. Create the integration user

Setup → **Users** → New User:
- Email/Username: `qbo-sync@htsworkforce.com` (any unique username works)
- Profile: a minimal API-only profile if you have one, else System Admin
- Save, then assign the **HTS QBO Integration** permission set (Setup →
  Permission Sets → HTS QBO Integration → Manage Assignments → Add).

### 1c. Create the Connected App

Setup → **App Manager** → New Connected App → (Create a Connected App):
- Name: `HTS QBO Sync`
- Enable OAuth Settings: ✅
- Callback URL: `https://login.salesforce.com/services/oauth2/callback`
  (required field; unused by JWT flow)
- Use digital signatures: ✅ → upload `secrets/sf-jwt.crt`
- Selected OAuth Scopes: **Manage user data via APIs (api)** and
  **Perform requests at any time (refresh_token, offline_access)**
- Save. Wait ~10 min for it to propagate.

Then **Manage** → Edit Policies:
- Permitted Users: **Admin approved users are pre-authorized**
- Save, then under Permission Sets add **HTS QBO Integration** (so the
  integration user is pre-authorized).

### 1d. Grab the values
- App Manager → your app → View → **Consumer Key** = `SF_CLIENT_ID`
- `SF_USERNAME` = `qbo-sync@htsworkforce.com`
- `SF_LOGIN_URL` = `https://login.salesforce.com` (or `https://test.salesforce.com`
  for a sandbox org)

---

## Phase 2 — Intuit app + QuickBooks (sandbox now)

You can use **your personal Intuit Developer account** for all sandbox work —
HTS's real books are not involved yet. Switch to an HTS-owned account + the
app's *production* keys before go-live (Phase 6).

### 2a. Create the app
1. Go to https://developer.intuit.com → sign in → **Dashboard** → Create an app
   → **QuickBooks Online and Payments**.
2. Name it `HTS QBO Sync`. Scope: **Accounting**.
3. **Keys & credentials → Development**: copy `Client ID` (= `QBO_CLIENT_ID`)
   and `Client Secret` (= `QBO_CLIENT_SECRET`).
4. Add a Redirect URI (Development): `http://localhost:8088/callback`
   (used once, locally, by `npm run qbo:authorize`).

### 2b. Sandbox company + realm
- A sandbox company is auto-created with your dev account
  (developer.intuit.com → Dashboard → **Sandbox**). Copy its **Company ID**
  = `QBO_REALM_ID`.

### 2c. Webhook (do this after deploy, Phase 5)
- App → **Webhooks** → set the endpoint to `https://<your-app>.fly.dev/webhook/qbo`,
  subscribe to **Invoice** events. Copy the **Verifier Token**
  = `QBO_WEBHOOK_VERIFIER_TOKEN`.

### 2d. Confirm the PO custom field
- In the QBO company: Gear → Account and Settings → Sales → Custom fields →
  ensure one named exactly **PO Number** exists and is on invoices. (Mary
  populates it per invoice.)

---

## Phase 3 — Postgres + local env

```bash
# Local Postgres for development:
docker compose up -d db

cp .env.example .env          # then fill in everything from Phases 1–2
npm install
npm run migrate               # create tables
```

For the SF key locally, leave `SF_JWT_KEY_PATH=./secrets/sf-jwt.key` in `.env`.

---

## Phase 4 — Authorize QBO + verify everything

```bash
npm run qbo:authorize         # opens a browser; log into the QBO company, Authorize
npm run preflight             # checks DB, Salesforce, QBO, and the reconcile gate
```

Fix anything `preflight` reports as `[FAIL]` before continuing. Then a safe,
read-only end-to-end test against an existing sandbox invoice:

```bash
npm run dry-run -- <a-real-sandbox-invoice-id>     # prints what it WOULD write
```

When that looks right, run the backfill:

```bash
npm run reconcile             # dry-run, writes a CSV to reports/ — review it
npm run reconcile -- --apply  # writes to Salesforce and opens the start gate
```

---

## Phase 5 — Deploy to Fly (sandbox)

```bash
# Edit fly.toml: set `app` and `primary_region`, and confirm the org with:
fly apps create <your-app-name> --org <your-org-slug>

# Create the database and attach it (sets DATABASE_URL secret automatically):
fly postgres create --org <your-org-slug> --name <your-app>-db
fly postgres attach <your-app>-db --app <your-app-name>

# Set secrets (NEVER put these in git or chat). The SF key goes inline:
fly secrets set --app <your-app-name> \
  QBO_ENV=sandbox \
  QBO_CLIENT_ID=... QBO_CLIENT_SECRET=... QBO_REALM_ID=... \
  QBO_WEBHOOK_VERIFIER_TOKEN=... \
  SF_CLIENT_ID=... SF_USERNAME=qbo-sync@htsworkforce.com \
  SF_LOGIN_URL=https://login.salesforce.com \
  OPS_ALERT_WEBHOOK_URL=...                         # optional Slack/Teams URL
fly secrets set --app <your-app-name> SF_JWT_KEY="$(cat secrets/sf-jwt.key)"

fly deploy                    # builds, runs migrations, starts web/worker/cdc
```

Then set the QBO webhook URL (Phase 2c) to `https://<your-app>.fly.dev/webhook/qbo`
and create/modify a sandbox invoice to watch it flow through (`fly logs`).

---

## Phase 6 — Go to production

1. Create the **HTS-owned** Intuit Developer account; recreate the app there.
2. Use its **Production** keys; submit the minimal app-assessment Intuit
   requires for production (no app-store listing needed for a private app).
3. Have someone with admin on **HTS's real QuickBooks** run `qbo:authorize`
   against the production realm.
4. `fly secrets set QBO_ENV=production QBO_CLIENT_ID=... QBO_REALM_ID=... ...`
5. `npm run reconcile -- --apply` against production, review the report.
6. Point the production QBO webhook at the Fly URL. Live.

See `RUNBOOK.md` for day-2 operations.
