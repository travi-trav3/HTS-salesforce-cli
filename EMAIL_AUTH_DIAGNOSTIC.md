# Email Authentication Diagnostic Report: htsrenew.com

**Date:** June 10, 2026
**Domain:** htsrenew.com
**Salesforce Org:** hts-prod (fun-agility-769)
**Registrar/DNS:** GoDaddy (ns41.domaincontrol.com / ns42.domaincontrol.com)
**Mail Platform:** Microsoft 365 (MX → htsrenew-com.mail.protection.outlook.com)

---

## DNS Findings

### SPF — PASS

```
v=spf1 include:spf.protection.outlook.com include:_spf.salesforce.com -all
```

- Single SPF record (correct — multiple v=spf1 records break SPF entirely)
- Includes Microsoft 365 (`spf.protection.outlook.com`) for regular mailbox sending
- Includes Salesforce (`_spf.salesforce.com`) for Salesforce outbound email
- Ends with `-all` (hard fail for unauthorized senders)
- **No action needed on SPF.**

### DKIM — LIKELY ROOT CAUSE

**Salesforce DKIM (sf1):**
```
sf1._domainkey.htsrenew.com  CNAME → sf1.qfc1ni.custdkim.salesforce.com
```
- DNS CNAME record **exists** and resolves to a valid DKIM public key
- The `qfc1ni` identifier is the Salesforce-generated domain key for this org

**Salesforce DKIM (sf2):**
```
sf2._domainkey.htsrenew.com  — NOT FOUND
```
- No second Salesforce DKIM selector in DNS
- Salesforce's side (`sf2.qfc1ni.custdkim.salesforce.com`) also doesn't resolve, suggesting either:
  - Salesforce only generated a single selector for this key, OR
  - The key was created with a different alternate selector name

**Microsoft 365 DKIM:**
```
selector1._domainkey.htsrenew.com  CNAME → selector1-htsrenew-com._domainkey.netorg17601982.d-v1.dkim.mail.microsoft
selector2._domainkey.htsrenew.com  CNAME → selector2-htsrenew-com._domainkey.netorg17601982.d-v1.dkim.mail.microsoft
```
- Both Microsoft DKIM selectors are published — good for regular M365 email

**The critical question:** Is the Salesforce DKIM key status **Active** in Salesforce Setup?

Even though the DNS CNAME for `sf1` is correctly published and resolves to a valid public key, **if the key is not activated in Salesforce, Salesforce will not sign outbound emails with DKIM**. This is almost certainly the root cause of the "Unverified Sender" flag.

### DMARC — EXISTS (acceptable)

```
v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```

- Record exists (prevents automatic "Unverified Sender" from missing DMARC alone)
- Policy `p=none` — monitoring only, no rejection (fine for now)
- Relaxed alignment for both DKIM (`adkim=r`) and SPF (`aspf=r`)
- RUA reports go to GoDaddy's generic address (`onsecureserver.net`)
- **No urgent action needed**, but consider updating `rua` to an HTS-controlled address later

### Salesforce Domain Verification — PASS

```
00DfI00000CQ7rO=1TBPW0000000Gcf
```

- Salesforce domain verification TXT record is present
- Domain is verified in the Salesforce org

### Other TXT Records

```
MS=ms64011568                         (Microsoft 365 domain verification)
NETORG19540849.onmicrosoft.com        (Microsoft 365 tenant association)
```

---

## Root Cause Analysis

**Why "Unverified Sender" appears in Outlook:**

When Salesforce sends email on behalf of dragsdale@htsrenew.com (or nikki@, isteele@), here's what happens:

1. **SPF check:** The envelope sender (Return-Path) is a Salesforce bounce address like `bounces@salesforce.com`, NOT `@htsrenew.com`. SPF passes for `salesforce.com` but **does NOT align** with the `From: dragsdale@htsrenew.com` header domain.

2. **DKIM check:** If the Salesforce DKIM key is not activated, Salesforce does not add a DKIM signature to the email. DKIM fails entirely.

3. **DMARC evaluation:** DMARC requires at least one of SPF or DKIM to pass **with domain alignment**. Since SPF doesn't align (different domain) and DKIM isn't signing, **DMARC fails**.

4. **Microsoft/Outlook result:** Outlook sees the DMARC failure and displays the "Unverified Sender" badge.

**The fix is to ensure the Salesforce DKIM key is Active so Salesforce signs emails with `d=htsrenew.com`, which gives DKIM alignment and DMARC pass.**

---

## Action Plan

### Step 1: Check & Activate Salesforce DKIM Key (Travis — CRITICAL)

1. Open Salesforce Setup:
   - Navigate to: **Setup → Email → DKIM Keys**
   - Or directly: `fun-agility-769.lightning.force.com/lightning/setup/DomainKeys/home`

2. Find the DKIM key for `htsrenew.com`:
   - **If a key exists** with selector `sf1` and domain key `qfc1ni`:
     - Check its **Status**
     - If status is **"Key not activated"** or **"Pending"**: Click **Activate**
     - Salesforce will verify the DNS CNAME resolves (it does) and activate the key
     - If it says it needs a second selector: note the exact selector name and CNAME value — that record needs to be added to GoDaddy DNS
   - **If NO key exists** for htsrenew.com:
     - The DNS CNAME `sf1._domainkey.htsrenew.com` → `sf1.qfc1ni.custdkim.salesforce.com` is an orphan from a previous setup
     - Create a new DKIM key:
       - Click **New Key**
       - Selector: any (e.g., `sf1`)
       - Domain: `htsrenew.com`
       - Key size: 2048-bit
     - Salesforce generates new CNAME value(s)
     - Update GoDaddy DNS with the new CNAME(s)
     - Wait 15-30 min for propagation
     - Return to Salesforce and click **Activate**

3. **Record what you see on the DKIM Keys page:**
   - Key exists? Y/N
   - Selector name(s)?
   - Status (Active / Pending / Not Activated)?
   - If Salesforce shows required DNS records, copy them exactly

### Step 2: Add Missing DNS Records in GoDaddy (if needed)

Only needed if Step 1 reveals a second CNAME requirement or new key values:

| Type  | Host                              | Value (from Salesforce)                     | TTL  |
|-------|-----------------------------------|---------------------------------------------|------|
| CNAME | sf2._domainkey                    | sf2.qfc1ni.custdkim.salesforce.com          | 3600 |

*The exact values will come from Salesforce Setup in Step 1.*

### Step 3: Resolve Default No-Reply Address Warning

1. In Salesforce Setup, go to: **Setup → Email → Organization-Wide Addresses**
2. Either:
   - **Option A (Quick):** Set one of the existing verified addresses (dragsdale@htsrenew.com or nikki@htsrenew.com) as the default no-reply
   - **Option B (Clean):** Create `no-reply@htsrenew.com` mailbox in Microsoft 365, add it as a new Org-Wide Email Address in Salesforce, verify it, then set as default no-reply
3. Go to: **Setup → Email → Deliverability** and set the verified address as the Default No-Reply Address

### Step 4: Test After Activation

After the DKIM key shows **Active** in Salesforce:

1. **Send test to Gmail:**
   - From Salesforce, send an email using one of the Org-Wide Email Addresses (dragsdale@htsrenew.com)
   - In Gmail: Open message → three dots → **Show original**
   - Verify all three pass:
     - `spf=pass`
     - `dkim=pass`
     - `dmarc=pass`

2. **Send test to Outlook/Microsoft:**
   - Send to the same address that previously showed "Unverified Sender"
   - Confirm the "Unverified Sender" badge is gone

3. **Run the diagnostic script:**
   ```bash
   bash scripts/dns-check-htsrenew.sh
   ```

### DMARC Improvement (Low priority, do later)

Update the DMARC `rua` to receive reports at an HTS-controlled address:

```
v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:dmarc@htsrenew.com;
```

After confirming all senders consistently pass, consider tightening to `p=quarantine`.

---

## Current DNS Record Summary (Live as of June 10, 2026)

| Record Type | Host/Name                           | Value                                                                 | Status |
|-------------|-------------------------------------|-----------------------------------------------------------------------|--------|
| TXT (SPF)   | htsrenew.com                        | `v=spf1 include:spf.protection.outlook.com include:_spf.salesforce.com -all` | OK |
| TXT (DMARC) | _dmarc.htsrenew.com                 | `v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | OK |
| TXT (SF verify) | htsrenew.com                    | `00DfI00000CQ7rO=1TBPW0000000Gcf`                                    | OK |
| TXT (MS verify) | htsrenew.com                    | `MS=ms64011568`                                                       | OK |
| CNAME (DKIM-SF) | sf1._domainkey.htsrenew.com     | `sf1.qfc1ni.custdkim.salesforce.com`                                  | OK (but key may not be Active in SF) |
| CNAME (DKIM-MS) | selector1._domainkey.htsrenew.com | `selector1-htsrenew-com._domainkey.netorg17601982.d-v1.dkim.mail.microsoft` | OK |
| CNAME (DKIM-MS) | selector2._domainkey.htsrenew.com | `selector2-htsrenew-com._domainkey.netorg17601982.d-v1.dkim.mail.microsoft` | OK |
| MX          | htsrenew.com                        | `0 htsrenew-com.mail.protection.outlook.com`                          | OK |
| NS          | htsrenew.com                        | `ns41.domaincontrol.com` / `ns42.domaincontrol.com`                   | GoDaddy |
