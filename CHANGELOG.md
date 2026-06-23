# Changelog

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
