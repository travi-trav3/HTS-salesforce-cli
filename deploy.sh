#!/bin/bash
set -euo pipefail

# ============================================================
# HTS Salesforce CLI — Deploy Script (Supervised Mode v1)
# ============================================================
# Queries Dylan's User ID from the target org, substitutes
# placeholders in metadata XML, and deploys to hts-prod.
# ============================================================

ORG_ALIAS="hts-prod"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "=== HTS Salesforce Deploy ==="
echo ""

# ----------------------------------------------------------
# Step 1: Query Dylan's User ID
# ----------------------------------------------------------
echo "Querying Dylan's User ID from $ORG_ALIAS..."
DYLAN_QUERY=$(sf data query \
  --query "SELECT Id FROM User WHERE Name LIKE '%Dylan%' AND IsActive=true LIMIT 1" \
  --target-org "$ORG_ALIAS" \
  --json 2>&1) || {
  echo "ERROR: Failed to query Dylan's User ID from $ORG_ALIAS"
  echo "$DYLAN_QUERY"
  exit 1
}

DYLAN_USER_ID=$(echo "$DYLAN_QUERY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
records = data.get('result', {}).get('records', [])
if not records:
    sys.exit(1)
print(records[0]['Id'])
" 2>/dev/null) || {
  echo "ERROR: No active user matching 'Dylan' found in $ORG_ALIAS"
  echo "Query result: $DYLAN_QUERY"
  exit 1
}

echo "  Dylan's User ID: $DYLAN_USER_ID"
echo ""

# ----------------------------------------------------------
# Step 2: Copy force-app to temp directory
# ----------------------------------------------------------
echo "Copying metadata to temp directory..."
cp -r force-app "$TEMP_DIR/"
echo "  Copied to $TEMP_DIR/force-app"
echo ""

# ----------------------------------------------------------
# Step 3: Substitute placeholders
# ----------------------------------------------------------
echo "Substituting placeholders..."

DYLAN_COUNT=$(grep -r "{{DYLAN_USER_ID}}" "$TEMP_DIR/force-app" --include="*.xml" -l | wc -l)
echo "  Files with {{DYLAN_USER_ID}}: $DYLAN_COUNT"

find "$TEMP_DIR/force-app" -name "*.xml" -exec \
  sed -i "s/{{DYLAN_USER_ID}}/$DYLAN_USER_ID/g" {} +

# Verify no placeholders remain
REMAINING=$(grep -r "{{.*_USER_ID}}" "$TEMP_DIR/force-app" --include="*.xml" -l 2>/dev/null | wc -l)
if [ "$REMAINING" -gt 0 ]; then
  echo "ERROR: Unresolved placeholders found:"
  grep -r "{{.*_USER_ID}}" "$TEMP_DIR/force-app" --include="*.xml"
  exit 1
fi

echo "  All placeholders resolved."
echo ""

# ----------------------------------------------------------
# Step 4: Deploy to org (objects → flexipages → flows)
# ----------------------------------------------------------
echo "=== Deploying to $ORG_ALIAS ==="
echo ""

# Deploy objects (custom fields) first
echo "Step 4a: Deploying custom fields..."
sf project deploy start \
  --source-dir "$TEMP_DIR/force-app/main/default/objects" \
  --target-org "$ORG_ALIAS" \
  --wait 10

echo ""

# Deploy flexipages
echo "Step 4b: Deploying Lightning Record Pages..."
sf project deploy start \
  --source-dir "$TEMP_DIR/force-app/main/default/flexipages" \
  --target-org "$ORG_ALIAS" \
  --wait 10

echo ""

# Deploy flows
echo "Step 4c: Deploying Flows..."
sf project deploy start \
  --source-dir "$TEMP_DIR/force-app/main/default/flows" \
  --target-org "$ORG_ALIAS" \
  --wait 10

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Verification checklist:"
echo "  1. Check Object Manager → Contact → Fields for all 39 custom fields"
echo "  2. Check Object Manager → Account → Fields for Onboarded_Account__c"
echo "  3. Check Object Manager → Task → Fields for Sequence_Task__c"
echo "  4. Check Contact Record Page assignment"
echo "  5. Create test Contact with Signal_Source → verify Flow 1 fires"
echo "  6. Set Next_Touch_Date=TODAY on active contact → verify Flow 2 creates task"
