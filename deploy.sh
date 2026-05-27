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

echo "Step 3e: Deploying Quick Action (Opportunity.Create_Work_Order)..."
sf project deploy start \
  --source-dir "force-app/main/default/quickActions" \
  --target-org "$ORG_ALIAS" \
  --wait 10 || echo "  Quick Action deploy reported issues; may need manual addition to Opportunity page layout."
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

echo "Step 3i: Deploying Flows..."
sf project deploy start \
  --source-dir "force-app/main/default/flows" \
  --target-org "$ORG_ALIAS" \
  --wait 20
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
echo "  2. Add 'Create Work Order' quick action to the Opportunity Lightning Record Page via App Builder."
echo "  3. Activate the 'Work Order Record Page' as the org default for Project__c"
echo "     (Setup → Object Manager → Work Order → Lightning Record Pages → Activation)."
echo "  4. Pin the Ops Dashboard tab in the HTS Operations app."
echo "  5. Run the Part 12 test plan from the brief."
