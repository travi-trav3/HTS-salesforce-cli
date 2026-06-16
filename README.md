# HTS Salesforce CLI

Salesforce DX metadata and deploy tooling for HTS's B2B automation build.
This repo covers **two product domains** that deploy to the same org:

| Domain | What it is | Key metadata |
|---|---|---|
| **Work Orders** | Operational backbone: project/work-order tracking, change orders, pre-mob task generation, PO low-balance alerts, ops dashboard | `Project__c`, `Change_Order__c`, `HTSOpsDashboardController`, `htsOpsDashboard` LWC, work-order flows, `HTS_Ops_Sprint1` permset |
| **Outreach** | B2B cold-outreach / sequencing engine: contact enrichment, multi-touch cadences, reply handling, outreach dashboards | `Contact`/`Account` custom fields, Task list views, outreach flows (`Cadence_Scheduler`, `Warming_Logic`, `Sequence_Initialization`, …), reports, dashboards |

A companion Node/TS middleware that syncs Salesforce ↔ QuickBooks Online
(`hts-qbo-sync`) lives in its **own repository**, not here.

## Layout

```
force-app/main/default/   Salesforce metadata (objects, flows, lwc, apex, flexipages, reports, dashboards, permsets)
deploy.sh                 Phased deploy to the target org (see below)
fix_flow_xml.py           Normalises Flow XML element ordering before deploy
scripts/                  Operational helper scripts (e.g. DNS / email-auth diagnostics)
.github/workflows/        CI (manual-gated Salesforce deploy)
```

## Deploying

`deploy.sh` runs a single phased deploy in Salesforce dependency order:
objects → fields → flows (deploy + activate) → apex → lwc → flexipages →
tabs → app → permsets → reports → dashboards. It queries the Dylan / Ian /
Amanda / Nikki user IDs from the org and substitutes them into flow XML
before deploying.

```bash
# Local (against the default/aliased org)
ORG_ALIAS=hts-prod ./deploy.sh
```

**CI deploys are manual-gated.** The `Deploy to Salesforce` workflow runs
only via **Actions → Run workflow** (`workflow_dispatch`) and requires the
operator to type `DEPLOY` to confirm. Nothing deploys automatically on push.

## Branching model

- `main` is the **source of truth** and is protected (PR + review required).
- Work happens on short-lived feature branches and merges back via PR.
- Stale branches are archived as `archive/<name>` tags before deletion so
  history is never lost while the branch list stays clean.
