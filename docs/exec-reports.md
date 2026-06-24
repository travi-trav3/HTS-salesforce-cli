# HTS Weekly Pipeline Snapshot — Nikki / CEO

Native Salesforce reports that feed a **weekly report subscription** to Nikki's
inbox every Monday morning. Zero ongoing cost (standard Sales Cloud Enterprise),
separate from the Gumloop operator report for Amanda/Dylan — do **not** consolidate
the two.

**Org:** `fun-agility-769.lightning.force.com` (alias `hts-prod`)

## What's in the repo

```
force-app/main/default/reports/
  HTS_Executive_Reports.reportFolder-meta.xml      # shared folder
  HTS_Executive_Reports/
    Open_Pipeline_by_Stage.report-meta.xml         # Report 1 — core CEO view
    Closed_Last_Week.report-meta.xml               # Report 2 — won/lost last 7 days
```

| Report | Format | Group | Scope | Filter |
|---|---|---|---|---|
| Open Pipeline by Stage | Summary | Stage | org-wide | Open (`Closed = false`) |
| Closed Last Week (Won + Lost) | Summary | Stage (won/lost subtotal) | org-wide | `Closed = true` + Close Date = Last Week |

Both sum Amount per group + grand total. Report 1 also sums Expected Revenue
(Amount × Probability, the weighted number) and carries Last Activity + Age columns
so Nikki can eyeball stalling deals. Detail rows sort Amount-descending (biggest
deals on top).

> ⚠️ **These files were authored from the standard Metadata-API report schema, NOT
> retrieved from `hts-prod`.** The build environment had no `sf` CLI and no org
> auth, so the brief's "retrieve a known-good example first" step could not run
> here. Report column tokens and filter values are version/locale-sensitive.
> **Run the validation pass below against a live retrieved example before deploying
> to prod.** Treat these as a high-fidelity template, not verified metadata.

## Deploy procedure (run from a machine authed to `hts-prod`)

### Step 1 — Retrieve the rollback baseline + a known-good token example

```bash
# Rollback baseline: current state of anything we might touch.
sf project retrieve start --metadata "ReportFolder:HTS Executive Reports" --target-org hts-prod || true

# Token example: pull ONE existing Opportunity report from the org. This reveals
# the exact column field tokens, the Closed filter value, and the relative-date
# value this org/version actually uses. If no Opportunity report exists, build a
# throwaway one in the UI (Opportunities report type, add the columns below), then:
sf project retrieve start --metadata "Report:<FolderName>/<ExistingReportName>" --target-org hts-prod
```

Commit whatever Step 1 returns as the rollback baseline before deploying.

### Step 2 — Validate tokens against the retrieved example

Diff the tokens in the two new files against the retrieved example. The
**high-confidence** tokens (leave as-is unless the example disagrees):
`OPPORTUNITY_NAME`, `ACCOUNT_NAME`, `AMOUNT`, `CLOSE_DATE`, `PROBABILITY`,
`STAGE_NAME`, `EXP_AMOUNT`, `INTERVAL_LASTWEEK`, `dateColumn=CLOSE_DATE`,
`scope=organization`.

**Confirm these against the retrieved example — they are the ones that vary by
version/locale:**

| Field in spec | Token used here | Confirm it matches the example |
|---|---|---|
| Opportunity Owner | `FULL_NAME` | ✓ confirmed via dry-run |
| Last Activity | `LAST_ACTIVITY` | ✓ confirmed via dry-run |
| Age (days open) | `AGE` | ✓ confirmed via dry-run |
| Closed filter column | `CLOSED` | ✓ confirmed (was `OPPORTUNITY.CLOSED`, rejected) |
| Closed filter value | `false` / `true` | ☐ (some orgs render `0` / `1`) |

> Note: the grouped field (`STAGE_NAME` in both reports) must NOT also appear in
> the column list — Salesforce rejects "groupings in the selected columns list".

If a token differs, edit the `.report-meta.xml` to match the retrieved example
exactly, then re-run validation.

### Step 3 — Validate-only deploy, then deploy

```bash
# Dry run first (no changes committed to the org):
sf project deploy start --source-dir force-app/main/default/reports \
  --target-org hts-prod --dry-run --wait 10

# Then the real deploy:
sf project deploy start --source-dir force-app/main/default/reports \
  --target-org hts-prod --wait 10
```

> These reports are intentionally **not** wired into `deploy.sh`. That script runs
> the Sprint 1 work-order deploy; reports are a separate, manually-triggered deploy
> so an unvalidated report can never piggyback onto a prod run.

### Step 4 — Verify in-org

1. Open each report in Salesforce. Confirm grouping (by Stage), the columns,
   per-stage subtotals + grand total, and that filters return live data.
2. Report 2 should only show opportunities closed in the last 7 days.
3. Confirm Nikki's user can open both reports (folder access — see below).

## Folder sharing — decision point

The folder ships as **`accessType = Public`, `publicFolderAccess = ReadOnly`**:
every internal user gets View access, which guarantees Nikki (CEO, top of the role
hierarchy) can open it. This is the most reliably-deployable option and was chosen
because Nikki's username wasn't available at build time to scope a per-user share.

**Org-wide pipeline Amount data is therefore visible to all internal users.** If
that's too broad, restrict it after deploy by either:

- **UI (30 sec):** open the folder → Share → remove "All internal users" → add
  Nikki (and any intended viewers) as **Viewer**. Then set the folder to private.
- **Metadata:** replace the `accessType`/`publicFolderAccess` block with a
  `folderShares` entry once Nikki's username is known:
  ```xml
  <folderShares>
      <accessLevel>View</accessLevel>
      <sharedTo>nikki@hts.example.com</sharedTo>   <!-- her actual username -->
      <sharedToType>User</sharedToType>
  </folderShares>
  ```
  (Requires Enhanced Analytics Folder Sharing, which is on by default in modern orgs.)

## The one manual step — weekly subscription (UI, ~2 min, one-time)

Report subscriptions are **not** in the Metadata API, so this is done once in the
browser and never touched again. Per report:

1. Open the report → **Subscribe**.
2. **Frequency:** Weekly → **Monday** → a morning time (e.g. 7:00 AM). The schedule
   runs in the timezone of the run-as user.
3. **Run report as:** simplest is Nikki runs as herself — as CEO she's at the top of
   the role hierarchy and already sees org-wide data. If an admin sets it up on her
   behalf, set **Run as** to a full-visibility user, then add Nikki as a recipient
   (needs the "Subscribe to Reports: Add Recipients" permission).
4. **Recipients:** Nikki (+ anyone else who should get the CEO view).
5. **Conditions:** leave unconditional (send every week).
6. Repeat for both reports so they arrive together Monday morning.

The subscription email delivers a formatted summary plus a click-through link into
the live report — headline numbers without logging in.

## Notes & gotchas

- **No credit cost.** Native Enterprise subscriptions; nothing touches Agentforce
  Flex Credits or Gumloop.
- **Cadence:** Monday morning mirrors the operator report. Friday EOW is the
  alternative (week-in-review framing) — change it later in the subscription dialog.
- **Custom fields:** this build uses standard Opportunity fields only. The repo's
  `Opportunity` object carries no custom fields. If HTS adds estimate/job-type
  fields worth surfacing to Nikki, add them as columns in a follow-up.
- **Upgrade path (later):** once these prove useful, the natural next step is a
  single CEO dashboard (funnel + won/lost + aging) with a dashboard subscription.
  Don't build it yet — prove the reports land first.
