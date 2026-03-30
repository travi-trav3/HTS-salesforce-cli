# Gumloop Build Guide — HTS B2B Sales Development

Step-by-step guide to building the Gumloop automation that powers the HTS outreach system. This connects to the Salesforce org you already set up.

---

## Overview: What You're Building

Three pipelines:

| Pipeline | Trigger | What It Does |
|---|---|---|
| **Pipeline 1: New Contact Creation** | Signal detected (Perplexity) | Research → Enrich → Dedup → Create Contact + Account → Generate Wave 1 copy |
| **Pipeline 2: JIT Copy Generation** | Scheduled daily | Query SF for contacts needing Wave 2/3 copy → Refresh research → Generate copy → Update SF |
| **Pipeline 3: Legacy Contact Tagging** | One-time run | Set `Exclude_From_Sequence__c` = true on ALL existing contacts before go-live |

---

## Pipeline 3: Legacy Contact Tagging (DO THIS FIRST)

**Purpose:** Prevent existing contacts from accidentally entering the sequence.

### Steps:
1. Create a new Gumloop flow
2. Add a **Salesforce Query** node:
   - Object: `Contact`
   - Query: `SELECT Id FROM Contact`
   - (Gets ALL existing contacts)
3. Add a **Loop** over the results
4. Inside the loop, add a **Salesforce Update** node:
   - Object: `Contact`
   - Field: `Exclude_From_Sequence__c` = `true`
5. Run once → verify in Salesforce that existing contacts have the checkbox checked
6. **Disable/delete this pipeline after running** — it's one-time only

---

## Pipeline 1: New Contact Creation

This is the main pipeline. It runs when a buying signal is detected and creates a fully enriched contact in Salesforce with Wave 1 copy ready to go.

### Step 1: Signal Detection (Input)

1. Add a **Perplexity** node (or scheduled search)
2. Configure search topics for buying intent signals:
   - Solar installation, O&M, staffing
   - Wind turbine technicians, O&M
   - BESS installation, contractors, energy storage
   - Renewable energy workforce, staffing
   - Telecom construction, infrastructure
   - Workforce solutions, skilled trades, field technicians
3. Output: Company name, signal details, citation URL

### Step 2: Company Research

1. Add a **Perplexity** node for company deep-dive:
   - Input: Company name from Step 1
   - Research: What does the company do? Recent news? Projects? Size? Location?
2. Output → will populate `Company_Research__c` (max 2000 chars)

### Step 3: Contact Discovery

1. Add a **LinkedIn Search** or **Apollo Search** node:
   - Input: Company name
   - Filter: Decision-makers (titles like VP Operations, Director of Field Services, etc.)
   - Filter by specialty relevance (PV, BESS, Wind, Utility, CNI)
2. Output: Contact name, title, email, phone, LinkedIn URL

### Step 4: Contact Research

1. Add a **Perplexity** node for contact research:
   - Input: Contact name + company
   - Research: LinkedIn activity, recent posts, role, background
2. Output → will populate `Contact_Research__c` (max 2000 chars)

### Step 5: Apollo Enrichment

1. Add an **Apollo Enrich** node:
   - Input: Contact email or LinkedIn URL
   - Get: Verified email, phone, company data, intent signals, contact ID
2. Map the email verification status:

   | Apollo Status | Salesforce `Email_Verified__c` Value |
   |---|---|
   | valid | Verified |
   | accept_all | Unverified |
   | unknown | Unverified |
   | disposable | Risky |
   | spamtrap | Risky |
   | invalid | Invalid |
   | bounce | Invalid |

3. Extract intent signals → `Intent_Signals__c` (max 1000 chars)
4. Extract/derive intent score → `Intent_Score__c` (1-100)

### Step 6: Determine Contact Specialty

Based on company research and contact title, classify into one of these exact values:
- `PV`
- `BESS`
- `Wind`
- `Utility`
- `CNI`
- `Unknown`

Use an AI/LLM node to classify based on the research data.

### Step 7: Salesforce Dedup Check

**This is critical — do NOT skip.**

1. Add a **Salesforce Query** node — check by email:
   - `SELECT Id FROM Contact WHERE Email = '[contact_email]'`
   - If match found → **STOP** — skip this contact

2. If no email match, add another **Salesforce Query** — check by LinkedIn URL:
   - `SELECT Id FROM Contact WHERE LinkedIn_Profile_URL__c = '[linkedin_url]'`
   - If match found → **STOP** — skip this contact

3. If no match on either → proceed to creation

### Step 8: Account Lookup/Creation

1. Add a **Salesforce Query** node — find existing Account:
   - `SELECT Id, Onboarded_Account__c FROM Account WHERE Name = '[company_name]'`

2. **If Account exists:** Use the existing Account ID. Note the `Onboarded_Account__c` value.

3. **If no Account:** Add a **Salesforce Create** node:
   - Object: `Account`
   - Fields:
     - `Name` = company name
     - `Onboarded_Account__c` = `false`

### Step 9: Generate Wave 1 Copy

Add an **AI/LLM** node to generate all 5 Wave 1 draft fields. The prompt should include:
- Company research (from Step 2)
- Contact research (from Step 4)
- Contact name, title, company
- Whether the account is onboarded (`Onboarded_Account__c`)
- Intent signals

**Content rules:**
- Casual, conversational, human tone. No corporate speak.
- 3-4 sentences max for emails and LinkedIn messages.
- Goal: get a meaningful reply, not pitch or book a meeting.
- Personalized — reference job title, LinkedIn activity, company news, signals.

**Onboarded vs. Non-Onboarded:**
- **Not Onboarded:** Casual intro, demonstrate relevance, reference signals. Relationship-first.
- **Onboarded:** Acknowledge existing relationship, connect with more people on their team. Relational only.

**Generate these 5 fields:**

| Field | Max Length | Description |
|---|---|---|
| `LinkedIn_Connection_Note__c` | 200 chars | Optional connection request note. Short. Most requests sent WITHOUT a note. |
| `Email_Draft_Intro__c` | 2000 chars | Touch 2 — Intro email from Dylan. Casual, 3-4 sentences. |
| `Email_Draft_Value1__c` | 2000 chars | Touch 3 — Value-add email from Nikki. Insight, case study, addressed to first name. |
| `LinkedIn_Message_Draft_1__c` | 1000 chars | Touch 4 — LinkedIn message if connected. |
| `Email_Draft_Sub4__c` | 2000 chars | Touch 4 fallback — Sub email from Dylan if NOT LinkedIn connected. |

### Step 10: Create the Contact in Salesforce

Add a **Salesforce Create** node:
- Object: `Contact`
- Fields to populate:

| Field | Value |
|---|---|
| `FirstName` | Contact's first name |
| `LastName` | Contact's last name |
| `Email` | Verified email |
| `Phone` | Phone number |
| `Title` | Job title |
| `AccountId` | Account ID from Step 8 |
| `Signal_Source__c` | Signal details + Perplexity citation URL |
| `Company_Research__c` | Company research from Step 2 |
| `Contact_Research__c` | Contact research from Step 4 |
| `Contact_Specialty__c` | One of: PV, BESS, Wind, Utility, CNI, Unknown |
| `LinkedIn_Profile_URL__c` | LinkedIn URL |
| `Enrichment_Source__c` | "Apollo" (or whatever source) |
| `Apollo_Contact_ID__c` | Apollo's unique ID |
| `Email_Verified__c` | Mapped value from Step 5 |
| `Intent_Signals__c` | Raw intent data |
| `Intent_Score__c` | 1-100 score |
| `LinkedIn_Connection_Note__c` | From Step 9 |
| `Email_Draft_Intro__c` | From Step 9 |
| `Email_Draft_Value1__c` | From Step 9 |
| `LinkedIn_Message_Draft_1__c` | From Step 9 |
| `Email_Draft_Sub4__c` | From Step 9 |
| `Copy_Generated_Through_Stage__c` | `Stage 1` |

**Do NOT populate:** Wave 2/3 draft fields (intentionally blank), flow-managed fields (Outreach_Status, Current_Touch, etc. — Flow 1 handles these automatically).

### Step 11: Error Handling

Add error handling after the Salesforce Create node:
- If creation fails → log error with contact details and failure reason
- Cache the research/enrichment data for retry
- Send alert email to **travis@appliedintelligenceai.co**: "Contact creation failed for [Name] at [Company]. Error: [reason]."
- **Never silently drop contacts**

### Step 12: Verify End-to-End

After building, test by:
1. Running the pipeline manually with a test signal
2. Check Salesforce: Contact created? All 23 fields populated?
3. Check: Did Flow 1 fire? (Outreach Status = Cold, Current Touch = 1, Task created?)
4. Check: Is Wave 1 copy in the draft fields?

---

## Pipeline 2: JIT Copy Generation (Scheduled Daily)

This pipeline runs daily and generates Wave 2 and Wave 3 copy for contacts approaching those stages.

### Schedule

Run daily — ideally early morning before the Salesforce Cadence Scheduler runs at 7 AM CT. Suggest **5:00 AM CT**.

### Step 1: Query for Contacts Needing Wave 2

Add a **Salesforce Query** node:
```
SELECT Id, FirstName, LastName, Title, Email, AccountId, Account.Name,
       Account.Onboarded_Account__c, Company_Research__c, Contact_Research__c,
       Contact_Specialty__c, LinkedIn_Profile_URL__c, Intent_Signals__c,
       Intent_Score__c, Current_Touch__c, Copy_Generated_Through_Stage__c
FROM Contact
WHERE Sequence_Status__c = 'Active'
  AND Copy_Generated_Through_Stage__c = 'Stage 1'
  AND Current_Touch__c >= 3
```

### Step 2: Query for Contacts Needing Wave 3

Add another **Salesforce Query** node:
```
SELECT Id, FirstName, LastName, Title, Email, AccountId, Account.Name,
       Account.Onboarded_Account__c, Company_Research__c, Contact_Research__c,
       Contact_Specialty__c, LinkedIn_Profile_URL__c, Intent_Signals__c,
       Intent_Score__c, Current_Touch__c, Copy_Generated_Through_Stage__c
FROM Contact
WHERE Sequence_Status__c = 'Active'
  AND Copy_Generated_Through_Stage__c = 'Stage 2'
  AND Current_Touch__c >= 8
```

### Step 3: Loop Over Wave 2 Contacts

For each contact needing Wave 2:

#### 3a. Refresh Company Research
- Perplexity search: fresh company news, projects, developments
- Update `Company_Research__c` in Salesforce

#### 3b. Refresh Contact Research
- LinkedIn/Perplexity: recent activity, posts, role changes
- Update `Contact_Research__c` in Salesforce

#### 3c. Generate Wave 2 Copy

Use AI/LLM with the **fresh** research to generate:

| Field | Max Length | Description |
|---|---|---|
| `Email_Draft_FollowUp__c` | 2000 chars | Touch 6 — Follow-up email from Dylan |
| `Email_Draft_Value2__c` | 2000 chars | Touch 7 — Value-add #2 from Nikki, different angle than Value #1 |
| `LinkedIn_Message_Draft_2__c` | 1000 chars | Touch 8 — LinkedIn message if connected |
| `Email_Draft_Sub8__c` | 2000 chars | Touch 8 fallback — Sub email from Dylan if NOT connected |

**Important context for the LLM:** This is Wave 2 — the contact has already received Touches 1-4. The copy should:
- Reference the earlier outreach subtly (don't repeat the intro)
- Use fresh research (not stale Wave 1 data)
- Escalate slightly — more specific value props
- Nikki's Touch 7 email should have a different angle than Touch 3

#### 3d. Update Salesforce

Update the Contact with:
- All 4 Wave 2 draft fields
- `Copy_Generated_Through_Stage__c` = `Stage 2`

### Step 4: Loop Over Wave 3 Contacts

For each contact needing Wave 3:

#### 4a. Refresh Research (same as 3a/3b)

#### 4b. Generate Wave 3 Copy

| Field | Max Length | Description |
|---|---|---|
| `Email_Draft_DirectAsk__c` | 2000 chars | Touch 10 — Direct ask from Dylan: "worth a conversation?" |
| `LinkedIn_Message_Draft_3__c` | 1000 chars | Touch 12 — Final LinkedIn follow-up if connected |
| `Email_Draft_Sub12__c` | 2000 chars | Touch 12 fallback — Sub email from Dylan if NOT connected |
| `Email_Draft_Pause__c` | 2000 chars | Touch 13 — Pause email: "giving it a rest" |

**Context for the LLM:** This is Wave 3 (final stage). The contact has received 9+ touches with no meaningful reply. The copy should:
- Be direct but respectful
- Touch 10: Clear ask — "is this worth a conversation?"
- Touch 13: Graceful exit — "parking this for now, door is open"
- Still personalized with fresh research

#### 4c. Update Salesforce

Update the Contact with:
- All 4 Wave 3 draft fields
- `Copy_Generated_Through_Stage__c` = `Stage 3`

### Step 5: Error Handling

For each contact where copy generation fails:
1. **Do NOT update `Copy_Generated_Through_Stage__c`** — the pipeline will retry on the next daily run
2. Log the error with contact ID and failure reason
3. Send alert to **travis@appliedintelligenceai.co**: "[Contact Name] copy generation failed — manual intervention may be needed"

---

## Picklist Value Reference

**Use these EXACT strings everywhere. No variations, no trailing spaces.**

```
Contact_Specialty__c:               PV | BESS | Wind | Utility | CNI | Unknown
Email_Verified__c:                  Verified | Unverified | Risky | Invalid
Copy_Generated_Through_Stage__c:    Stage 1 | Stage 2 | Stage 3
```

These are the only picklist fields Gumloop writes to. All other picklists are managed by Salesforce Flows.

---

## Salesforce API Field Reference

### Fields Gumloop Writes (23 total on Contact creation)

| API Name | Type | Max Length |
|---|---|---|
| `Signal_Source__c` | Long Text | 1000 |
| `Company_Research__c` | Long Text | 2000 |
| `Contact_Research__c` | Long Text | 2000 |
| `Contact_Specialty__c` | Picklist | — |
| `LinkedIn_Profile_URL__c` | URL | — |
| `Enrichment_Source__c` | Text | 255 |
| `Apollo_Contact_ID__c` | Text | 255 |
| `Email_Verified__c` | Picklist | — |
| `Intent_Signals__c` | Long Text | 1000 |
| `Intent_Score__c` | Number | — |
| `LinkedIn_Connection_Note__c` | Text | 200 |
| `Email_Draft_Intro__c` | Long Text | 2000 |
| `Email_Draft_Value1__c` | Long Text | 2000 |
| `LinkedIn_Message_Draft_1__c` | Long Text | 1000 |
| `Email_Draft_Sub4__c` | Long Text | 2000 |
| `Email_Draft_FollowUp__c` | Long Text | 2000 |
| `Email_Draft_Value2__c` | Long Text | 2000 |
| `LinkedIn_Message_Draft_2__c` | Long Text | 1000 |
| `Email_Draft_Sub8__c` | Long Text | 2000 |
| `Email_Draft_DirectAsk__c` | Long Text | 2000 |
| `LinkedIn_Message_Draft_3__c` | Long Text | 1000 |
| `Email_Draft_Sub12__c` | Long Text | 2000 |
| `Email_Draft_Pause__c` | Long Text | 2000 |
| `Copy_Generated_Through_Stage__c` | Picklist | — |

### Fields Gumloop Writes on Account

| API Name | Type |
|---|---|
| `Onboarded_Account__c` | Checkbox |

### Fields Gumloop NEVER Writes (Flow-managed)

These are set automatically by Salesforce Flows — do not touch:
- `Outreach_Status__c`, `Sequence_Stage__c`, `Sequence_Status__c`
- `Current_Touch__c`, `Sequence_Start_Date__c`, `Next_Touch_Date__c`, `Last_Touch_Date__c`
- `Meaningful_Reply__c`, `Reply_Date__c`, `Reply_Channel__c`, `Reply_Type__c`
- `Email_Opens_Count__c`, `Exclude_From_Sequence__c`, `LinkedIn_Connected__c`

---

## Build Order

1. **Pipeline 3** (Legacy tagging) — Run once before anything else
2. **Pipeline 1** (New contact creation) — Core pipeline, build and test first
3. **Pipeline 2** (JIT copy generation) — Build after Pipeline 1 is working

## Testing Checklist

- [ ] Pipeline 3: All existing contacts have `Exclude_From_Sequence__c` = true
- [ ] Pipeline 1: Creates Account if needed, finds existing if present
- [ ] Pipeline 1: Dedup check works — skips existing contacts
- [ ] Pipeline 1: All 23 contact fields populated correctly
- [ ] Pipeline 1: Flow 1 fires after creation (Outreach Status = Cold, Touch 1 task created)
- [ ] Pipeline 1: Wave 1 copy is personalized and within length limits
- [ ] Pipeline 1: Error handling sends alert on failure
- [ ] Pipeline 2: Correctly queries Wave 2 contacts (Stage 1 + touch >= 3)
- [ ] Pipeline 2: Correctly queries Wave 3 contacts (Stage 2 + touch >= 8)
- [ ] Pipeline 2: Research is refreshed (not stale)
- [ ] Pipeline 2: Wave 2/3 copy populated and `Copy_Generated_Through_Stage__c` updated
- [ ] Pipeline 2: Failed contacts don't get stage updated (retry on next run)
- [ ] End-to-end: Gumloop creates contact → Flow 1 fires → Cadence Scheduler creates tasks with correct draft copy
