#!/bin/bash
set -euo pipefail

# ============================================================
# HTS Salesforce CLI — Deploy Script (Supervised Mode v3)
# ============================================================
# Unified deploy for BOTH product domains:
#   - Work Orders   (Project__c / Change_Order__c, ops dashboard, work-order flows)
#   - Outreach      (Contact/Account fields, Task list views, outreach flows,
#                    reports, dashboards)
#
# Queries Dylan / Ian / Amanda / Nikki User IDs from the target org,
# substitutes {{DYLAN_USER_ID}} / {{IAN_USER_ID}} / {{AMANDA_USER_ID}} /
# {{NIKKI_USER_ID}} placeholders in flow metadata, then deploys every
# metadata type ONCE in Salesforce dependency order
# (objects → fields → apex → lwc → flexipages → tabs → app → flows →
#  permsets → reports → dashboards).
# ============================================================

ORG_ALIAS="${ORG_ALIAS:-hts-prod}"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "=== HTS Salesforce Deploy ==="
echo "Target org: $ORG_ALIAS"
echo ""

# ----------------------------------------------------------
# query_user_id <NAME_PATTERN> <LABEL> -> echoes 18-char User Id
# Works in CI too: the workflow authenticates to the org via JWT
# before running this, so the live query succeeds without hardcoding.
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
  if grep -q '{{[A-Z]*_USER_ID}}' "$file" 2>/dev/null; then
    local tmpfile="$file.tmp"
    sed \
      -e "s/{{DYLAN_USER_ID}}/${DYLAN_USER_ID}/g" \
      -e "s/{{IAN_USER_ID}}/${IAN_USER_ID}/g" \
      -e "s/{{AMANDA_USER_ID}}/${AMANDA_USER_ID}/g" \
      -e "s/{{NIKKI_USER_ID}}/${NIKKI_USER_ID}/g" \
      "$file" > "$tmpfile"
    mv "$tmpfile" "$file"
    echo "  Substituted in: $(basename "$file")"
  fi
}

for file in "$FLOW_DIR"/*.xml; do
  substitute "$file"
done

REMAINING=$(grep -r -l '{{[A-Z]*_USER_ID}}' "$TEMP_DIR/force-app" --include="*.xml" 2>/dev/null | wc -l | tr -d ' ' || true)
if [ "$REMAINING" -gt 0 ]; then
  echo "ERROR: Unresolved placeholders remain:"
  grep -r -l '{{[A-Z]*_USER_ID}}' "$TEMP_DIR/force-app" --include="*.xml"
  exit 1
fi
echo "  All placeholders resolved."
echo ""

cd "$TEMP_DIR"

# ----------------------------------------------------------
# Step 3: Phased deploy — every metadata type deployed ONCE,
# in Salesforce dependency order, covering BOTH domains.
# ----------------------------------------------------------
echo "=== Deploying to $ORG_ALIAS ==="
echo ""

echo "Step 3a: Deploying Project__c and Change_Order__c objects + fields..."
sf project deploy start \
  --source-dir "force-app/main/default/objects/Project__c" \
  --source-dir "force-app/main/default/objects/Change_Order__c" \
  --target-org "$ORG_ALIAS" \
  --wait 15
echo ""

echo "Step 3a-2: Deploying Contact and Account custom fields..."
sf project deploy start \
  --source-dir "force-app/main/default/objects/Contact" \
  --source-dir "force-app/main/default/objects/Account" \
  --target-org "$ORG_ALIAS" \
  --wait 10
echo ""

echo "Step 3b: Deploying Task custom fields..."
echo "  (If these were created manually in the UI to work around the"
echo "   metadata-API picklist quirk, this step will no-op or warn — safe to ignore.)"
if ! sf project deploy start \
  --source-dir "force-app/main/default/objects/Task/fields" \
  --target-org "$ORG_ALIAS" \
  --wait 15 2>&1; then
  echo ""
  echo "WARNING: Task field deploy failed via metadata API (known Salesforce quirk"
  echo "with the Task object's restricted Type picklist)."
  echo "If the fields already exist in the org (created manually), continuing is safe."
  echo "Work-order gate fields:"
  echo "  - Is_Gate__c (Checkbox, default false)"
  echo "  - Pre_Mob_Section__c (Picklist: A. Financial + Scope, B. Staffing, C. Safety,"
  echo "    D. Training, E. Tools + Fleet, F. Procurement, G. Schedule, H. Client Alignment, Sign-off)"
  echo "  - Overdue_Alert_Sent__c (Checkbox, default false)"
  echo "  - Escalated__c (Checkbox, default false)"
  echo "Outreach field:"
  echo "  - Sequence_Task__c (Checkbox, default false)"
fi
echo ""

echo "Step 3b-2: Deploying Task list views..."
if [ -d "force-app/main/default/objects/Task/listViews" ]; then
  if ! sf project deploy start \
    --source-dir "force-app/main/default/objects/Task/listViews" \
    --target-org "$ORG_ALIAS" \
    --wait 10 2>&1; then
    echo ""
    echo "WARNING: Task list views failed to deploy (most often because"
    echo "Task.Sequence_Task__c does not exist yet — create it manually per Step 3b)."
  fi
else
  echo "  No Task list views found — skipping."
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

echo "Step 3f: Deploying FlexiPages (fail-soft)..."
if ! sf project deploy start \
  --source-dir "force-app/main/default/flexipages" \
  --target-org "$ORG_ALIAS" \
  --wait 15 2>&1; then
  echo ""
  echo "WARNING: FlexiPage deploy reported issues. New record pages should deploy clean;"
  echo "existing-page or template-level modifications may silently no-op. Verify in App Builder."
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

echo "Step 3i: Deploying Flows..."
sf project deploy start \
  --source-dir "force-app/main/default/flows" \
  --target-org "$ORG_ALIAS" \
  --wait 20
echo ""

echo "Step 3j: Deploying Permission Sets (fail-soft)..."
if [ -d "force-app/main/default/permissionsets" ]; then
  if ! sf project deploy start \
    --source-dir "force-app/main/default/permissionsets" \
    --target-org "$ORG_ALIAS" \
    --wait 10 2>&1; then
    echo "  Permission set deploy reported issues; continuing."
  fi
else
  echo "  No permission sets found — skipping."
fi
echo ""

echo "Step 3k: Deploying Reports (fail-soft)..."
# The two task reports rely on the "Open & Completed Activities" standard
# filter, which is set in-org and NOT represented in report XML — any deploy
# resets it to "Open" and zeroes the reports. Exclude them so the in-org
# setting survives; they remain in the repo for reference only.
rm -f "force-app/main/default/reports/HTS_Outreach_Reports/Dylan_Task_Completion.report-meta.xml"
rm -f "force-app/main/default/reports/HTS_Outreach_Reports/Tasks_Completed_This_Week.report-meta.xml"
if [ -d "force-app/main/default/reports" ]; then
  if ! sf project deploy start \
    --source-dir "force-app/main/default/reports" \
    --target-org "$ORG_ALIAS" \
    --wait 10 2>&1; then
    echo "  Some reports failed to deploy. Check errors above."
  fi
else
  echo "  No reports directory found — skipping."
fi
echo ""

echo "Step 3l: Deploying Dashboards (fail-soft)..."
if [ -d "force-app/main/default/dashboards" ]; then
  if ! sf project deploy start \
    --source-dir "force-app/main/default/dashboards" \
    --target-org "$ORG_ALIAS" \
    --wait 10 2>&1; then
    echo "  Some dashboards failed to deploy. Check errors above."
  fi
else
  echo "  No dashboards directory found — skipping."
fi
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Manual post-deploy steps:"
echo "  1. Assign permission sets to users, e.g.:"
echo "       sf org assign permset --name HTS_Ops_Sprint1 --on-behalf-of <username> --target-org $ORG_ALIAS"
echo ""
echo "  2. Create the 'Create Work Order' Quick Action on Opportunity (Flow: Create Work Order),"
echo "     then add it to the Opportunity Lightning Record Page via App Builder."
echo ""
echo "  3. Build/activate the Work Order and Change Order record pages in Lightning App Builder"
echo "     (see brief Part 0); activate as org default for Project__c / Change_Order__c."
echo ""
echo "  4. Build the Overdue Gate Task Alert as a scheduled flow (Salesforce does not allow"
echo "     record-triggered flows on Task): daily, Tasks where Is_Gate__c=true AND"
echo "     Status!='Completed' AND ActivityDate<TODAY AND Work Order Stage='Pre-Mob';"
echo "     @mention owner, and Nikki if 3+ days overdue."
echo ""
echo "  Outreach verification:"
echo "    - Contact → Fields: confirm all custom fields; Account → Onboarded_Account__c;"
echo "      Task → Sequence_Task__c."
echo "    - Create a test Contact with Signal_Source → verify Sequence Initialization fires."
echo "    - Set Next_Touch_Date=TODAY on an active contact → verify Cadence Scheduler creates a task."
echo "    - Check the Dashboards tab for HTS Outreach dashboards."
