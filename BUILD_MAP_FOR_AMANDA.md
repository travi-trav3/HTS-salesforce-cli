# HTS Salesforce — How It's Built

**For:** Amanda
**From:** Travis
**Purpose:** A plain-English explanation of how the Salesforce system is built and wired together — so you can support it, troubleshoot it, and explain it to the team.

---

## Part 1 — What's Live (the 60-second summary)

Sprint 1 gave us an operational backbone in Salesforce:

- **Work Orders** — created from an Opportunity once a deal is inked
- **Change Orders** — adjustments that roll up to a Work Order's PO total
- **Pre-Mob task generation** — 30 tasks auto-created when a Work Order enters Pre-Mob
- **PO low-balance alerts** — notify you + Nikki when a PO is running low
- **Overdue task alerts** — daily check that nudges owners and escalates to Nikki
- **Ops dashboard** — a live view of active Work Orders and PO health

The rest of this doc explains **how those pieces actually work** under the hood.

---

## Part 2 — The Building Blocks

Everything we built is made from a handful of standard Salesforce "parts." Once you know what each part does, the whole system is easy to reason about.

| Building block | Plain-English meaning | Where we used it |
|---|---|---|
| **Custom Object** | A new type of record — like adding a new tab/table to Salesforce | Work Order, Change Order |
| **Field** | A single data point on a record | PO Amount, Stage, Mob Date, etc. |
| **Formula / Roll-Up field** | A field Salesforce *calculates* — nobody types it in | % Remaining, Remaining Balance |
| **Flow** | The automation engine — a "robot" that runs on a trigger and does work | Create Work Order, Pre-Mob tasks, alerts |
| **Custom Notification** | The mechanism behind in-app + mobile push alerts | PO + overdue alerts |
| **Scheduled Flow** | A Flow that runs on a clock instead of on a trigger | Daily overdue-task check |
| **List View** | A saved, filtered list of records | "My Open Pre-Mob Tasks," etc. |
| **Quick Action** | A button that creates a record or launches a flow | Create Work Order, New Change Order |
| **Permission Set** | Controls who can see and do what | HTS Ops Sprint 1 |
| **LWC + Apex** | The one piece that's custom *code*, not point-and-click config | The Ops dashboard |

**The key distinction:** almost everything is **configuration** (point-and-click, lives in Setup), except the dashboard, which is **code**. Config is easy to change; code changes go through Travis.

---

## Part 3 — How the Pieces Connect (the data flow)

This is the most useful mental model. The system runs as a **chain** — each step hands off to the next:

```
Opportunity (deal inked)
      │
      ▼  [ "Create Work Order" button → Flow ]
Work Order created (Stage = Pre-Mob)
      │
      ▼  [ "Generate Pre-Mob Tasks" Flow fires automatically ]
30 Tasks created, assigned to the right owners
      │
      ▼  [ "Overdue Gate Task Alert" Flow runs daily at 8 AM ET ]
Overdue tasks → notification to owner → 3+ days → escalate to Nikki

(in parallel)
Work Order PO balance drops
      │
      ▼  [ "PO Low Balance Alert" Flow fires on update ]
Notification to Amanda + Nikki
```

**Why this matters for troubleshooting:** when something doesn't happen, you trace *backward up the chain*. If Pre-Mob tasks didn't appear, the question is "did the Pre-Mob flow run?" — which points you upstream to the Work Order and its Stage.

---

## Part 4 — Where to Find Each Piece in Setup

So you can actually go look when you need to:

| To see… | Go to… |
|---|---|
| The objects + their fields | **Setup → Object Manager → Work Order / Change Order** |
| The automation (flows) | **Setup → Flows** |
| Whether a scheduled flow ran | **Setup → Scheduled Jobs** *and* **Setup → Paused and Failed Flow Interviews** |
| The notification type | **Setup → Custom Notifications** |
| Who has access | **Setup → Permission Sets → HTS Ops Sprint 1** |
| The list views | Open the **Tasks** tab → list-view dropdown (top left) |

---

## Part 5 — Troubleshooting: Where to Look First

You don't need to *fix* these — but knowing the first place to look lets you triage fast and give Travis a precise starting point.

**"A Work Order's Pre-Mob tasks didn't generate."**
→ Check the Work Order's **Stage** — the flow only fires when Stage = Pre-Mob.
→ Then **Setup → Paused and Failed Flow Interviews** for an error on that record.

**"A notification didn't fire."**
→ For overdue alerts: **Setup → Scheduled Jobs** — confirm the daily job ran today.
→ Confirm the task actually qualifies (it's a gate task, past due, not completed).

**"The % Remaining looks wrong."**
→ It's a calculated field — check the inputs: PO Amount, Change Orders, and billing. The math is downstream of those, so a wrong number means a wrong input.

**"Someone can't see or do something."**
→ It's almost always the **Permission Set**. Confirm they're assigned "HTS Ops Sprint 1."

**"The dashboard is stale / not updating."**
→ It refreshes on load; reload the page. (We can add an auto-refresh-on-focus + manual refresh button if it's a recurring annoyance.)

**General rule:** note the **record name**, what you *expected*, what *actually* happened, and a screenshot. That's everything Travis needs to diagnose in minutes.

---

## Part 6 — How It's Built & Configured (the "managed properly" part)

This is what makes the system maintainable rather than fragile:

- **Metadata-as-code.** The entire configuration — every object, field, flow, and permission — lives in a **Git repository** (version-controlled file storage), not just clicked into the org by hand.
- **Repeatable deploys.** Changes are pushed to Salesforce through a **command-line script** (`deploy.sh`), so a change can be reviewed, deployed, and — if needed — **rolled back**.
- **Why you care:** every change is tracked (who, what, when), nothing is a mystery "someone configured this once and left," and rebuilding or auditing the system is straightforward. This is the difference between a system you can *trust and scale* and one that quietly drifts.

When you want a change, the path is: **you describe it → Travis makes it in the repo → it deploys → it's logged.** Small config tweaks are quick; anything touching code (the dashboard) or new automation takes a bit more.

---

## Questions? 

Slack Travis with the **record name + a screenshot** and he'll either answer or build a quick how-to. New ideas go on a running list and get batched into the next build cycle.
