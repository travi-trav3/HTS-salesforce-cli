# Changelog

## Exec reports — weekly pipeline snapshot for Nikki (CEO)

Native Salesforce reports for the Monday-morning CEO pipeline view. Delivered to
Nikki's inbox via a manual one-time report subscription (subscriptions aren't in
the Metadata API). See [`docs/exec-reports.md`](docs/exec-reports.md) for the
retrieve/validate/deploy/verify runbook and the subscription setup.

### Added
- Report folder `HTS Executive Reports` (`ReportFolder`, shared read-only).
- Report `Open Pipeline by Stage` — org-wide open opportunities grouped by stage,
  biggest deals first, with Amount + Expected Revenue subtotals and Last Activity /
  Age columns for spotting stalls.
- Report `Closed Last Week (Won + Lost)` — org-wide opportunities closed in the
  last 7 days, grouped so won/lost subtotal separately.

### Notes
- Authored from the standard Metadata-API report schema, **not** retrieved from
  `hts-prod` (build env had no `sf` CLI / org auth). Column tokens and filter
  values are version/locale-sensitive — validate against a retrieved example
  before the prod deploy (checklist in `docs/exec-reports.md`).
- Intentionally **not** wired into `deploy.sh`; reports deploy separately so an
  unvalidated report can't piggyback onto a Sprint 1 prod run.

## Sprint batch — premob dates, completion audit, PO threshold, task fields/views, dashboard

Deployed to `hts-prod`. See [`docs/sprint-batch.md`](docs/sprint-batch.md) for the
full plain-English + technical breakdown and the org-specific deployment notes.

### Added
- `Task.Completed_By__c` (Lookup→User) and `Task.Completed_Date__c` (DateTime),
  surfaced via FLS in `HTS_Ops_Sprint1`.
- `Task.Customer_Site__c` (Text 255) and `Task.Job_Code__c` (Text 80), stamped
  from the parent Work Order by the premob flow at task creation.
- `Stamp_Task_Completion` before-save flow on Task: records the running user +
  timestamp when Status changes to Completed (never overwrites an existing
  completer).
- Ops Dashboard: clickable Work Order record links (NavigationMixin), a bounded
  Recent Activity feed (latest 15, showing the actual completer), and the Missing
  PO Data alert pinned to the top. `HTSOpsDashboardController.recentActivity`.
- Task list views "Pre-Mob Tasks" and "Pre-Mob Tasks: Next 7 Days"
  (UI-managed; see deployment notes).

### Fixed
- `Generate_PreMob_Tasks`: premob task due dates no longer generate past-due for
  jobs awarded inside the mobilization window. Offsets now compress proportionally
  and clamp to today (`scripts/generate_premob_flow.py`).
- PO low-balance alert threshold corrected to **25% remaining** (field default +
  `PO_Low_Balance_Alert` flow fallback); confirmed the comparison reads percent
  remaining, not percent spent.

### Notes
- This org's Metadata API can't deploy new Task/Activity custom fields or Task
  list views via CLI; those are created/maintained manually in Setup. `deploy.sh`
  step 3b is expected to fail and is non-fatal. Details in `docs/sprint-batch.md`.
