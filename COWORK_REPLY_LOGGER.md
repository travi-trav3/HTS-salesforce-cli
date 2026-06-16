# Cowork × Claude — Email Reply Auto-Logger (Salesforce)

**Goal:** When a prospect replies to a sequence email, automatically log the
outcome on their Salesforce Contact — so the dashboards' Engaged / Reply /
Meeting metrics fill in without Dylan touching Salesforce. LinkedIn replies
stay manual (Salesforce can't see LinkedIn).

This closes the gap the dashboards exposed: Dylan does the outreach (≈138
touches/week), but reply/meeting **outcomes** weren't being logged, so the
funnel showed 0 Engaged / 0 Meetings.

---

## Architecture (Cowork routine)

```
New inbound email (Dylan's connected mailbox)
        │
        ▼
1. Is it a reply from a sequenced contact?  ── no ─▶ stop
        │ yes
        ▼
2. Match Salesforce Contact by sender email (exact, case-insensitive)
        │  0 matches  ─▶ stop (optionally flag Dylan)
        │  >1 matches ─▶ flag Dylan, do not auto-write
        │  exactly 1
        ▼
3. Claude classifies the reply  →  JSON
        │
        ▼
4. Apply guardrails (confidence, idempotency)
        │
        ▼
5. Write outcome fields to the Contact
        │
        ▼
6. If meeting intent detected → create a Task for Dylan (do NOT auto-book)
```

**Connections needed in Cowork:** Dylan's email (Gmail/Outlook) + Salesforce
(the Salesforce connector, authenticated as a user with edit access to
Contact). No new Salesforce build required — all target fields already exist.

---

## Step 3 — Claude classification prompt (paste into the Cowork Claude step)

> You are classifying a single inbound email reply from a B2B sales prospect.
> Return **only** valid JSON, no prose.
>
> Input you'll receive: the reply's subject, body, and the prospect's name/company.
>
> Classify:
> - `meaningful`: true if a real human wrote a substantive reply. false for
>   auto-replies, out-of-office, bounces, "unsubscribe"-only system messages,
>   or pure pleasantries with no content.
> - `reply_type`: one of exactly `Positive`, `Not Interested / Bad Timing`,
>   `Hard Opt-Out`, `Auto-Reply / OOO`.
>   - `Positive` = interested, asking questions, open to a conversation/meeting.
>   - `Not Interested / Bad Timing` = polite no, "not now", "circle back later".
>   - `Hard Opt-Out` = remove me / stop / unsubscribe / legal-tinged refusal.
>   - `Auto-Reply / OOO` = automated message, out of office, mailer-daemon.
> - `meeting_intent`: true if they propose, accept, or ask to schedule a call/meeting.
> - `confidence`: 0.0–1.0, your confidence in `reply_type`.
> - `reasoning`: one sentence.
>
> Output JSON shape:
> `{"meaningful": bool, "reply_type": string, "meeting_intent": bool, "confidence": number, "reasoning": string}`

---

## Step 5 — Classification → Salesforce field mapping

Match a single Contact, then apply by `reply_type`. All API names below are real
fields on Contact.

| reply_type | `Meaningful_Reply__c` | `Reply_Type__c` | `Reply_Channel__c` | `Reply_Date__c` | `Outreach_Status__c` | Extra |
|---|---|---|---|---|---|---|
| **Positive** | `true` | `Positive` | `Email` | today | `Engaged` | if `meeting_intent` → create Task for Dylan |
| **Not Interested / Bad Timing** | `true` | `Not Interested / Bad Timing` | `Email` | today | `Engaged` | — |
| **Hard Opt-Out** | `true` | `Hard Opt-Out` | `Email` | today | `Deferred` | `Exclude_From_Sequence__c = true`; `Sequence_Status__c = Deferred` |
| **Auto-Reply / OOO** | — (leave) | — | — | — | — | **write nothing** — skip |

Notes:
- **Never auto-set `Outreach_Status__c = Meeting Scheduled`.** Booking is a human
  action (calendar coordination). When `meeting_intent` is true, create a Task
  assigned to Dylan: *"Meeting requested — book it and set Meeting Scheduled"* and
  let him flip the status (which stamps `Meeting_Booked_Date__c` via the flow).
- `Reply_Channel__c = Email` always for this routine (LinkedIn stays manual).

---

## Step 4 — Guardrails (do these or the dashboards get noisy)

1. **Single-match only.** Write only when exactly one Contact matches the sender
   email. 0 → skip; >1 → flag Dylan, no write.
2. **Confidence gate.** If `confidence < 0.6`, don't write — create a Task for
   Dylan to classify manually. Better a missed auto-log than a wrong one.
3. **Idempotency.** Skip if the Contact already has `Meaningful_Reply__c = true`
   **and** `Reply_Date__c = today` (prevents a multi-message thread from
   re-writing). Only "upgrade" status, never downgrade (e.g., don't move an
   already-`Meeting Scheduled` contact back to `Engaged`).
4. **Opt-outs are sacred.** `Hard Opt-Out` must set `Exclude_From_Sequence__c =
   true` so no further touches fire. This is compliance, not optional.
5. **No meeting auto-booking** (see above).

---

## Test plan (run before turning it loose)

1. Send a fake **positive** reply from a test address that matches a test
   Contact → expect `Meaningful_Reply=true`, `Reply_Type=Positive`,
   `Outreach_Status=Engaged`, `Reply_Date=today`.
2. Send an **OOO** auto-reply → expect **no field changes**.
3. Send a **"please remove me"** → expect `Hard Opt-Out` +
   `Exclude_From_Sequence__c=true`.
4. Send a **"can we grab 15 min Thursday?"** → expect `Engaged` + a Task for
   Dylan (status stays Engaged until he books).
5. Reply twice in one thread → expect only one write (idempotency).

Once these pass, the dashboard's **Engaged Count**, **Engaged Trend**,
**Reply** mix, and (after Dylan books) **Meetings Booked** start populating on
their own.

---

## What stays manual
- **LinkedIn replies** — Salesforce/Cowork can't see LinkedIn DMs. Dylan logs
  these by hand (same field mapping above, `Reply_Channel__c = LinkedIn`).
- **Booking meetings** — Dylan sets `Outreach Status = Meeting Scheduled` when a
  meeting is actually on the calendar; the flow auto-stamps `Meeting_Booked_Date__c`.
