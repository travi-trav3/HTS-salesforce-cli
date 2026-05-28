#!/bin/bash
set -euo pipefail

# ============================================================
# HTS Salesforce CLI — Deploy Script (Supervised Mode v2)
# ============================================================
# Queries Dylan / Ian / Amanda / Nikki User IDs from the
# target org, substitutes {{DYLAN_USER_ID}} / {{IAN_USER_ID}} /
# {{AMANDA_USER_ID}} / {{NIKKI_USER_ID}} placeholders in flow
# metadata, and deploys to hts-prod in the order required by
# the Sprint 1 brief.
# ============================================================

ORG_ALIAS="${ORG_ALIAS:-hts-prod}"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "=== HTS Salesforce Deploy ==="
echo "Target org: $ORG_ALIAS"
echo ""

# ----------------------------------------------------------
# query_user_id <NAME_PATTERN> <LABEL> -> echoes 18-char User Id
# ----------------------------------------------------------
query_user_id() {
  local pattern="$1"
  local label="$2"
  local result
  result=$(sf data query \
    --query "SELECT Id FROM User WHERE Name LIKE '%${pattern}%' AND IsActive=true LIMIT 1" \
    --target-org "$ORG_ALIAS" \
    --json) || {
    echo "ERROR: Failed to query ${label}'s User ID" >&2
    echo "$result" >&2
    return 1
  }
  local id
  id=$(echo "$result" | python3 -c "
import sys, json
text = sys.stdin.read()
# sf CLI may prepend warnings to stdout; locate the JSON object.
start = text.find('{')
if start == -1:
    sys.exit(1)
try:
    data = json.loads(text[start:])
except json.JSONDecodeError:
    sys.exit(1)
records = data.get('result', {}).get('records', [])
if not records:
    sys.exit(1)
print(records[0]['Id'])
" 2>/dev/null) || {
    echo "ERROR: No active user matching '${pattern}' in $ORG_ALIAS" >&2
    return 1
  }
  echo "$id"
}

# ----------------------------------------------------------
# query_notification_type_id <DEVELOPER_NAME> -> echoes 18-char ID
# Reads CustomNotificationType via Tooling API.
# ----------------------------------------------------------
query_notification_type_id() {
  local dev_name="$1"
  local result
  result=$(sf data query \
    --query "SELECT Id FROM CustomNotificationType WHERE DeveloperName='${dev_name}' LIMIT 1" \
    --use-tooling-api \
    --target-org "$ORG_ALIAS" \
    --json) || {
    echo "ERROR: Failed to query CustomNotificationType ${dev_name}" >&2
    return 1
  }
  echo "$result" | python3 -c "
import sys, json
text = sys.stdin.read()
start = text.find('{')
if start == -1:
    sys.exit(1)
try:
    data = json.loads(text[start:])
except json.JSONDecodeError:
    sys.exit(1)
records = data.get('result', {}).get('records', [])
if not records:
    sys.exit(1)
print(records[0]['Id'])
" 2>/dev/null
}

# ----------------------------------------------------------
# activate_flow <FLOW_API_NAME>
# Salesforce often deploys flows as Draft. This activates the latest
# version via the Tooling API.
# ----------------------------------------------------------
activate_flow() {
  local api_name="$1"
  local ver_result
  # Flow object in Tooling API stores the API name on the parent
  # FlowDefinition; reference it through the Definition relationship.
  ver_result=$(sf data query \
    --query "SELECT VersionNumber FROM Flow WHERE Definition.DeveloperName='${api_name}' AND Status!='Obsolete' ORDER BY VersionNumber DESC LIMIT 1" \
    --use-tooling-api --target-org "$ORG_ALIAS" --json) || {
    echo "  ${api_name}: version lookup failed (activate manually in Setup > Flows)"
    return 0
  }
  local version
  version=$(echo "$ver_result" | python3 -c "
import sys, json
text = sys.stdin.read()
start = text.find('{')
if start == -1: sys.exit(1)
try:
    data = json.loads(text[start:])
except json.JSONDecodeError:
    sys.exit(1)
records = data.get('result', {}).get('records', [])
if records:
    print(records[0]['VersionNumber'])
" 2>/dev/null)

  local def_result
  def_result=$(sf data query \
    --query "SELECT Id FROM FlowDefinition WHERE DeveloperName='${api_name}'" \
    --use-tooling-api --target-org "$ORG_ALIAS" --json) || {
    echo "  ${api_name}: FlowDefinition lookup failed"
    return 0
  }
  local def_id
  def_id=$(echo "$def_result" | python3 -c "
import sys, json
text = sys.stdin.read()
start = text.find('{')
if start == -1: sys.exit(1)
try:
    data = json.loads(text[start:])
except json.JSONDecodeError:
    sys.exit(1)
records = data.get('result', {}).get('records', [])
if records:
    print(records[0]['Id'])
" 2>/dev/null)

  if [ -n "$version" ] && [ -n "$def_id" ]; then
    if sf data update record \
      --sobject FlowDefinition \
      --record-id "$def_id" \
      --values "ActiveVersionNumber=$version" \
      --use-tooling-api --target-org "$ORG_ALIAS" >/dev/null 2>&1; then
      echo "  Activated: ${api_name} (v${version})"
    else
      echo "  Could not auto-activate ${api_name} v${version} (activate manually in Setup > Flows)"
    fi
  else
    echo "  Skipped activation: ${api_name} (version=${version:-empty}, defId=${def_id:-empty})"
  fi
}

# ----------------------------------------------------------
# Step 1: Query User IDs
# ----------------------------------------------------------
echo "Step 1: Querying User IDs from $ORG_ALIAS..."
DYLAN_USER_ID=$(query_user_id "Dylan" "Dylan")
IAN_USER_ID=$(query_user_id "Ian" "Ian")
AMANDA_USER_ID=$(query_user_id "Amanda" "Amanda")
NIKKI_USER_ID=$(query_user_id "Nikki" "Nikki")

echo "  Dylan:  $DYLAN_USER_ID"
echo "  Ian:    $IAN_USER_ID"
echo "  Amanda: $AMANDA_USER_ID"
echo "  Nikki:  $NIKKI_USER_ID"
echo ""

echo "Step 1b: Querying Custom Notification Type IDs..."
HTS_PO_ALERT_TYPE_ID=$(query_notification_type_id "HTS_PO_Alert" || true)
if [ -z "${HTS_PO_ALERT_TYPE_ID:-}" ]; then
  echo "  WARNING: 'HTS_PO_Alert' Custom Notification Type not found."
  echo "  Create it via Setup > Custom Notifications > New (name: HTS PO Alert)."
  echo "  Skipping notification placeholder substitution; flows that reference it will fail."
  HTS_PO_ALERT_TYPE_ID="MISSING"
else
  echo "  HTS_PO_Alert: $HTS_PO_ALERT_TYPE_ID"
fi
echo ""

# ----------------------------------------------------------
# Step 2: Copy metadata to temp dir and substitute placeholders
# ----------------------------------------------------------
echo "Step 2: Copying metadata to temp directory and substituting placeholders..."
cp -r force-app "$TEMP_DIR/"
cp sfdx-project.json "$TEMP_DIR/"
FLOW_DIR="$TEMP_DIR/force-app/main/default/flows"

# Fix Flow XML element ordering (Salesforce requires alphabetical grouping;
# repeated metadata generation can interleave elements).
if [ -f fix_flow_xml.py ]; then
  echo "  Normalising flow XML element order..."
  python3 fix_flow_xml.py "$FLOW_DIR" > /dev/null
fi

substitute() {
  local file="$1"
  if grep -q '{{[A-Z_]*}}' "$file" 2>/dev/null; then
    local tmpfile="$file.tmp"
    sed \
      -e "s/{{DYLAN_USER_ID}}/${DYLAN_USER_ID}/g" \
      -e "s/{{IAN_USER_ID}}/${IAN_USER_ID}/g" \
      -e "s/{{AMANDA_USER_ID}}/${AMANDA_USER_ID}/g" \
      -e "s/{{NIKKI_USER_ID}}/${NIKKI_USER_ID}/g" \
      -e "s/{{HTS_PO_ALERT_TYPE_ID}}/${HTS_PO_ALERT_TYPE_ID}/g" \
      "$file" > "$tmpfile"
    mv "$tmpfile" "$file"
    echo "  Substituted in: $(basename "$file")"
  fi
}

for file in "$FLOW_DIR"/*.xml; do
  substitute "$file"
done

REMAINING=$(grep -r -l '{{[A-Z_]*}}' "$TEMP_DIR/force-app" --include="*.xml" 2>/dev/null | wc -l | tr -d ' ' || true)
if [ "$REMAINING" -gt 0 ]; then
  echo "ERROR: Unresolved placeholders remain:"
  grep -r -l '{{[A-Z_]*}}' "$TEMP_DIR/force-app" --include="*.xml"
  exit 1
fi
echo "  All placeholders resolved."
echo ""

cd "$TEMP_DIR"

# ----------------------------------------------------------
# Step 3: Sprint 1 — phased deploy (objects -> fields -> rest)
# Order per Part 0 of the brief: objects → fields → picklists →
# formulas/rollups → screen flow + quick action → record-triggered
# flows → LWC + Apex → page layouts → tests.
# Field metadata is bundled inside each object directory so
# objects + fields + picklists + formulas + rollups deploy together.
# ----------------------------------------------------------
echo "=== Sprint 1 Deploy: Work Orders ==="
echo ""

echo "Step 3a: Deploying Project__c and Change_Order__c objects + fields..."
sf project deploy start \
  --source-dir "force-app/main/default/objects/Project__c" \
  --source-dir "force-app/main/default/objects/Change_Order__c" \
  --target-org "$ORG_ALIAS" \
  --wait 15
echo ""

# Deploy + activate flows before the Apex step. The Apex test inserts a
# Project__c that triggers PO Low Balance Alert; if the active flow in
# the org is missing required fields (e.g. Target ID on Send Custom
# Notification), the insert fails and the test fails with it. Deploying
# and activating the latest flow XML first guarantees the test runs
# against the same version source-controlled here.
echo "Step 3a-2: Deploying Flows..."
sf project deploy start \
  --source-dir "force-app/main/default/flows" \
  --target-org "$ORG_ALIAS" \
  --wait 20
echo ""

echo "Step 3a-3: Activating Sprint 1 flows (Salesforce often deploys flows as Draft)..."
for flow in Create_Work_Order Generate_PreMob_Tasks PO_Low_Balance_Alert Overdue_Gate_Task_Alert; do
  activate_flow "$flow"
done
echo ""

echo "Step 3b: Deploying new Task custom fields..."
echo "  (If these were created manually in the UI to work around the"
echo "   metadata-API picklist quirk, this step will no-op or warn — safe to ignore.)"
if ! sf project deploy start \
  --source-dir "force-app/main/default/objects/Task" \
  --target-org "$ORG_ALIAS" \
  --wait 15 2>&1; then
  echo ""
  echo "WARNING: Task field deploy failed via metadata API (known Salesforce quirk)."
  echo "If the four fields already exist in the org (created manually), continuing is safe."
  echo "Required fields:"
  echo "  - Is_Gate__c (Checkbox, default false)"
  echo "  - Pre_Mob_Section__c (Picklist values: A. Financial + Scope, B. Staffing, C. Safety,"
  echo "    D. Training, E. Tools + Fleet, F. Procurement, G. Schedule, H. Client Alignment, Sign-off)"
  echo "  - Overdue_Alert_Sent__c (Checkbox, default false)"
  echo "  - Escalated__c (Checkbox, default false)"
fi
echo ""

echo "Step 3c: Deploying Apex (HTSOpsDashboardController + test)..."
sf project deploy start \
  --source-dir "force-app/main/default/classes" \
  --target-org "$ORG_ALIAS" \
  --wait 15
echo ""

echo "Step 3d: Deploying LWC htsOpsDashboard..."
sf project deploy start \
  --source-dir "force-app/main/default/lwc" \
  --target-org "$ORG_ALIAS" \
  --wait 10
echo ""

echo "Step 3e: Quick Action — manual setup (see post-deploy steps)."
echo ""

echo "Step 3f: Deploying FlexiPages (Work Order, Change Order, Ops Dashboard)..."
if ! sf project deploy start \
  --source-dir "force-app/main/default/flexipages" \
  --target-org "$ORG_ALIAS" \
  --wait 15 2>&1; then
  echo ""
  echo "WARNING: FlexiPage deploy reported issues. New record pages should deploy clean;"
  echo "existing-page modifications may silently no-op. Verify in App Builder."
fi
echo ""

echo "Step 3g: Deploying Tabs..."
sf project deploy start \
  --source-dir "force-app/main/default/tabs" \
  --target-org "$ORG_ALIAS" \
  --wait 10 || echo "  Tabs deploy reported issues; continuing."
echo ""

echo "Step 3h: Deploying Lightning App (HTS_Operations)..."
sf project deploy start \
  --source-dir "force-app/main/default/applications" \
  --target-org "$ORG_ALIAS" \
  --wait 10 || echo "  Application deploy reported issues; continuing."
echo ""

echo "Step 3i: Flows already deployed + activated in Step 3a-2/3a-3."
echo ""

echo "Step 3j: Deploying Permission Set (HTS_Ops_Sprint1)..."
sf project deploy start \
  --source-dir "force-app/main/default/permissionsets" \
  --target-org "$ORG_ALIAS" \
  --wait 10 || echo "  Permission set deploy reported issues; continuing."
echo ""

echo "=== Sprint 1 Deployment Complete ==="
echo ""
echo "Manual post-deploy steps:"
echo "  1. Assign permission set 'HTS Ops Sprint 1' to users:"
echo "       sf org assign permset --name HTS_Ops_Sprint1 --on-behalf-of <username> --target-org $ORG_ALIAS"
echo ""
echo "  2. Create the 'Create Work Order' Quick Action on Opportunity (2 min):"
echo "       Setup → Object Manager → Opportunity → Buttons, Links, and Actions → New Action"
echo "       Action Type: Flow"
echo "       Flow: Create Work Order"
echo "       Label: Create Work Order"
echo "       Save, then add the action to the Opportunity Lightning Record Page via App Builder."
echo ""
echo "  3. Build the Work Order Record Page in Lightning App Builder (~7 min):"
echo "       Setup → Object Manager → Work Order → Lightning Record Pages → New"
echo "       Choose 'Header and Right Sidebar' template, label 'Work Order Record Page'."
echo "       Sections (drag Field Section components into the main column):"
echo "         - Project Details (Name, Stage, Opportunity, Customer, Site, Mob Date,"
echo "           Method, Project Lead, Job Code, Requires New Hires, SOW Notes, Days to Mob)"
echo "         - PO & Financials (PO Number, PO Amount, CO Total, Total Contract Value,"
echo "           Invoiced, Remaining Balance, % Remaining, Alert Threshold, Last Invoice,"
echo "           Billing Terms)"
echo "         - Cash Flow Inputs (Project Length, Biweekly Labor, Tooling Budget)"
echo "         - Billing Rates (Tech 2 ST/OT, Tech 1 ST/OT)"
echo "       Add Related Lists below. Save → Activate → Org Default."
echo ""
echo "  4. Build the Change Order Record Page (~2 min):"
echo "       Object Manager → Change Order → Lightning Record Pages → New"
echo "       One Field Section with: Name, Work Order, Amount, Date Received, CO PO Number,"
echo "       Description. Save → Activate → Org Default."
echo ""
echo "  5. Activate the Work Order Record Page as the org default for Project__c"
echo "     (Setup → Object Manager → Work Order → Lightning Record Pages → Activation)."
echo ""
echo "  6. Pin the Ops Dashboard tab in the HTS Operations app."
echo ""
echo "  7. Build the Overdue Gate Task Alert as a scheduled flow (Salesforce does not allow"
echo "     record-triggered flows on Task). In Flow Builder: New Flow → Scheduled Flow,"
echo "     daily at 8am, filter Tasks where Is_Gate__c=true AND Status!='Completed' AND"
echo "     ActivityDate<TODAY AND related Work Order Stage='Pre-Mob'; post Chatter @mention"
echo "     to owner; if 3+ days overdue, also @mention Nikki."
echo ""
echo "  8. Wire up Chatter @mentions on PO Low Balance Alert in Flow Builder (Amanda + Nikki)."
echo ""
echo "  9. Run the Part 12 test plan from the brief."
