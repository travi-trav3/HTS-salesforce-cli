#!/bin/bash
set -euo pipefail

# ============================================================
# HTS Salesforce CLI — Cleanup Script
# ============================================================
# Removes the Contact-Outreach metadata that was accidentally
# deployed from the wrong brief, so the org is clean before
# the Sprint 1 deploy.
#
# Deletes:
#   - 39 Contact custom fields
#   - 1 Account custom field (Onboarded_Account__c)
#   - 1 Task custom field (Sequence_Task__c)
#   - 5 Flows (Cadence_Scheduler, Meaningful_Reply_Handler,
#     Sequence_Initialization, Warming_Logic, Watchdog_Monitor)
# ============================================================

ORG_ALIAS="${ORG_ALIAS:-hts-prod}"

echo "=== HTS Salesforce Cleanup ==="
echo "Target org: $ORG_ALIAS"
echo ""
echo "This will DELETE the Contact-Outreach metadata that was"
echo "accidentally deployed. It does NOT touch Sprint 1 objects"
echo "(Project__c, Change_Order__c don't exist yet)."
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi
echo ""

# ----------------------------------------------------------
# Step 1: Deactivate the 5 flows so they can be deleted.
# Salesforce will not delete an Active flow.
# ----------------------------------------------------------
echo "Step 1: Deactivating flows..."
for flow in Cadence_Scheduler Meaningful_Reply_Handler Sequence_Initialization Warming_Logic Watchdog_Monitor; do
  echo "  Deactivating $flow..."
  if ! sf data query \
    --query "SELECT Id, VersionNumber FROM Flow WHERE DefinitionName='$flow' AND Status='Active' LIMIT 1" \
    --use-tooling-api \
    --target-org "$ORG_ALIAS" \
    --json > /tmp/flow_check.json 2>&1; then
    echo "    (could not query — skipping)"
    continue
  fi

  active_id=$(python3 -c "
import sys, json
try:
    data = json.load(open('/tmp/flow_check.json'))
    records = data.get('result', {}).get('records', [])
    if records:
        print(records[0]['Id'])
except Exception:
    pass
")

  if [ -z "${active_id:-}" ]; then
    echo "    (no active version — already inactive)"
    continue
  fi

  if sf data update record \
    --sobject Flow \
    --record-id "$active_id" \
    --values "Status=Obsolete" \
    --use-tooling-api \
    --target-org "$ORG_ALIAS" >/dev/null 2>&1; then
    echo "    Deactivated."
  else
    echo "    Could not deactivate via API. Deactivate manually in Setup -> Flows then re-run."
  fi
done
echo ""

# ----------------------------------------------------------
# Step 2: Destructive deploy — delete the fields and flows.
# ----------------------------------------------------------
echo "Step 2: Deploying destructive changes..."
sf project deploy start \
  --manifest cleanup/package.xml \
  --post-destructive-changes cleanup/destructiveChanges.xml \
  --target-org "$ORG_ALIAS" \
  --ignore-warnings \
  --wait 10

echo ""
echo "=== Cleanup Complete ==="
echo ""
echo "Verify in Salesforce:"
echo "  - Object Manager -> Contact -> Fields: only standard fields remain"
echo "  - Object Manager -> Account -> Fields: Onboarded_Account__c is gone"
echo "  - Object Manager -> Task -> Fields: Sequence_Task__c is gone"
echo "  - Setup -> Flows: the 5 sequence flows are gone"
