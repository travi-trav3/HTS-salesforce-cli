# HTS Ops Sprint Batch — What Shipped

Operations build deployed to `hts-prod` (`fun-agility-769`). Five items, each
with a plain-English description (for ops/stakeholders) and the technical detail
(for future maintainers). Shipped via PR #5.

---

## 1. Premob date fix

**What it does:** When a job is awarded with a mobilization date that's close
(inside the premob lead window), the premob task checklist no longer generates
with due dates that are already in the past. Due dates compress proportionally to
fit the shorter timeline and never land before today.

**Technical:** The `Generate_PreMob_Tasks` record-triggered flow built each task's
due date as `MobilizationDate − fixedOffset`. For jobs awarded inside the window,
the larger offsets produced negative/past-due dates. Rewritten so each due date is:

```
TODAY() + MAX(leadDays − ROUND(offset × MIN(1, leadDays / 14), 0), 0)
```

i.e. offsets scale to the available lead time and are clamped so nothing is ever
created past-due. Ample lead time reproduces the original schedule. Logic lives in
`scripts/generate_premob_flow.py` (the flow is generated, not hand-edited); the
corrected version is the active flow version in prod.

## 2. Completion audit

**What it does:** Every Task records *who actually marked it complete* and *when* —
separate from who it was assigned to. If Amanda closes out Ian's task, the record
shows Amanda as the completer with a timestamp.

**Technical:** Added Task fields `Completed_By__c` (Lookup→User) and
`Completed_Date__c` (DateTime). The before-save record-triggered flow
`Stamp_Task_Completion` (active) stamps the running user + current datetime when
Status changes to Completed, with an `IsNull` guard so an existing completer is
never overwritten.

## 3. PO threshold

**What it does:** Low-PO-balance alerts fire when a job has **25% of its budget
remaining** (previously a placeholder value), and they correctly measure budget
*remaining*, not budget *spent*.

**Technical:** `PO_Alert_Threshold__c` default changed 15→25; the
`PO_Low_Balance_Alert` flow's fallback threshold changed 15→25. Confirmed
`Percent_Remaining__c = Remaining_Balance / (PO + CO) × 100` reads percent
remaining and the alert fires when that crosses below the threshold (direction was
already correct).

## 4. Task list fields + views

**What it does:** Tasks carry the **Customer Site** and **Job Code** from their
parent Work Order, so jobs are distinguishable at a glance. Two saved list views:
**"Pre-Mob Tasks"** and **"Pre-Mob Tasks: Next 7 Days"** (the latter filters to
tasks due today through the next 7 days).

**Technical:** Added Task fields `Customer_Site__c` (Text 255) and `Job_Code__c`
(Text 80). The premob flow stamps both from the parent Work Order at creation
(avoids cross-object traversal through the polymorphic `WhatId`). List views are
UI-managed — this org's Metadata API rejects standard Task list-view column/filter
tokens — so the list-view metadata is not tracked in the repo; Setup is the system
of record.

## 5. Ops Dashboard

**What it does:** Work Order numbers on the Ops Dashboard are **clickable** (open
the record without leaving the dashboard), a new **Recent Activity** feed shows the
latest task activity (and who completed it), and the **Missing PO Data** alert is
pinned to the **top** for visibility.

**Technical:** `htsOpsDashboard` LWC renders Work Order names as `NavigationMixin`
record links, adds a bounded recent-activity section (latest 15 activities on
active Work Orders, surfacing the completer), and moves the Missing-PO tile to the
top. `HTSOpsDashboardController` gained a `recentActivity` query referencing
`Completed_By__r`.

---

## Deployment notes (org-specific quirks)

This prod org has a Metadata-API quirk: **new custom fields on Task/Activity** and
**Task list views** cannot be deployed via the CLI:

- New Task fields fail with `bad value for restricted picklist field: Task`
  (the `Pre_Mob_Section__c` restricted picklist poisons the whole Task field
  deploy). Deploy step `3b` in `deploy.sh` is therefore expected to fail and is
  non-fatal.
- Task list views fail with unresolvable column/filter tokens
  (`ASSIGNED_TO`, `ActivityDate`, `Status`).

These pieces are created/maintained **manually in Setup**. Everything else —
`Project__c` objects/fields, flows, Apex, the LWC, and the permission set —
deploys via `deploy.sh`. See the `deploy.sh` post-deploy notes for the manual
checklist (fields to create, layouts, list-view filters).

## Post-deploy manual checklist

- Create the four Task fields in Setup if not present: `Completed_By__c`,
  `Completed_Date__c`, `Customer_Site__c`, `Job_Code__c`.
- Confirm the active flow versions (`Generate_PreMob_Tasks`,
  `PO_Low_Balance_Alert`, `Stamp_Task_Completion`).
- Add the four fields to the Task page layout, and add Completed By / Completed
  Date to the Work Order (`Project__c`) Activity related list.
- Smoke test: Pre-Mob WO ~5 days out → tasks have today/future due dates with
  Customer Site + Job Code; complete a task as another user → Completed By/Date
  stamp; drop a PO under 25% → alert fires.
