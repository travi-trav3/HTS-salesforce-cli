# HTS Salesforce Build Map

**For:** Amanda
**From:** Travis
**Purpose:** Plain-English picture of what's live, what's landing this week, and what's parked for next month.

---

## TL;DR

1. **Sprint 1 is live.** Work Orders, Pre-Mob tasks, PO alerts, overdue alerts, and the Ops dashboard are all running.
2. **Four fixes land before Friday's call** (Phase A) — all from your feedback email.
3. **Three items are parked** with a clear trigger for when to build them.

---

## What's Live Now (Sprint 1)

### 1. Work Orders (`Project__c`)
- Created from the Opportunity record once a deal is inked
- You own creation; Dylan & team work from them
- Tracks: PO Amount, Remaining Balance, % Remaining, Stage, Mobilization Date, Project Lead
- Auto-calculates % Remaining as Change Orders and billing roll up

### 2. Change Orders (`Change_Order__c`)
- Linked to a parent Work Order
- Fields: CO Amount, CO PO #, Date Received, Description
- Adds to PO total and bumps % Remaining back up

### 3. Pre-Mob Task Generation
- When a Work Order is created in "Pre-Mob" stage, **30 tasks auto-generate**
- Tasks are owned by: Dylan (Materials, Delivery), Project Lead (Equipment), you (PPE, Flights — interim for Mary)
- Each task has a due date, section label, and gate flag where applicable

### 4. PO Low Balance Alerts
- When PO % Remaining drops below the threshold (default 15%) → in-app notification to you + Nikki
- Includes a flag (`PO_Alert_Sent__c`) so you don't get spammed
- Auto-resets when a Change Order brings balance back up

### 5. Overdue Gate Task Alerts
- Daily scheduled check at 8 AM Eastern (after Phase A2 — see below)
- Any gate task past due + not completed → notification to task owner
- 3+ days overdue → escalates to Nikki

### 6. Ops Dashboard (LWC component)
- Custom-built dashboard showing active Work Orders, PO health, upcoming mobilizations
- Lives on the Ops home page

### 7. Cadence / Contact Outreach
- Sequence tasks generated on Contacts
- Includes the dedupe fix from last week (no more duplicate "MISSING COPY" tasks on touches 3, 7, 10)

---

## Landing Before Friday (Phase A)

These came directly from your feedback email. All four are built — deploying this week.

| # | What | Why |
|---|------|-----|
| **A1** | Overdue alert write-back fix | The standard overdue path wasn't logging that it had fired. Reporting will be accurate going forward. |
| **A2** | Move overdue alert schedule from 8 AM UTC → 8 AM Eastern | Notifications now land in the morning where you work, not the middle of the night. |
| **A3** | Three new list views: **My Open Pre-Mob Tasks**, **My Tasks This Week**, **All Pre-Mob Tasks** | Lightweight scoping — anyone can see anyone's work, but everyone gets a focused inbox. |
| **A4** | **"New Change Order"** button on the Work Order header | One click to log a CO without leaving the Work Order. Project lookup pre-fills. |

**After deploy:** A4 needs one UI step — dragging the new button onto the Work Order page header in App Builder. Takes 30 seconds; I'll walk you through it.

---

## Parked Items (and the Trigger to Build)

### 1. Conditional Task Routing (config table for ownership)
- **Lift:** ~4-5 hours, not in Sprint 1 scope
- **Trigger to build:** When you find yourself wishing you could reassign a task or add a new team member yourself without pinging me
- **Workaround today:** Tell me, I update + deploy in ~15 min

### 2. Compressed-Timeline Rule
- For jobs awarded with less than 14 days before mobilization (tasks would be "born overdue")
- **Waiting on your call:** Proportional compression (squeeze the timeline) vs. floor rule (minimum X days per task) vs. hybrid
- Bring your preference to Friday's call

### 3. Mary's Onboarding Swap
- Currently you own PPE + Flights as interim
- When Mary's Salesforce user is created, I swap two lines of XML and redeploy → tasks flow to her instead
- ~10 min of work, no decisions needed

---

## How to Get Help

- **Bug or odd behavior:** Slack me, with the Work Order name + a screenshot if possible
- **"How do I…" UI questions:** Slack me; I'll either answer directly or build a one-page how-to
- **New feature ideas:** Add to a running list — we batch into the next sprint

---

## What's Next (Sprint 2 candidates)

These are on deck for the next build cycle once we close out Phase A:

- QuickBooks Online integration (PO sync, billing pull-through)
- Additional dashboard tiles based on your feedback
- Any of the parked items that hit their trigger

I'll send a shaped Sprint 2 proposal after Friday's call.
