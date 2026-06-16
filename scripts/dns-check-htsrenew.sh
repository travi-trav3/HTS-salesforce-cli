#!/bin/bash
# DNS Authentication Diagnostic for htsrenew.com
# Run this from any machine with dig installed to verify DNS records.
# Usage: bash scripts/dns-check-htsrenew.sh

DOMAIN="htsrenew.com"
PASS="\033[0;32mPASS\033[0m"
FAIL="\033[0;31mFAIL\033[0m"
WARN="\033[0;33mWARN\033[0m"

echo "============================================"
echo " Email Authentication Diagnostic: $DOMAIN"
echo " $(date)"
echo "============================================"
echo ""

echo "--- SPF ---"
SPF=$(dig TXT "$DOMAIN" +short | grep "v=spf1")
if [ -z "$SPF" ]; then
  echo -e "  [$FAIL] No SPF record found"
else
  echo "  Record: $SPF"
  SPF_COUNT=$(dig TXT "$DOMAIN" +short | grep -c "v=spf1")
  if [ "$SPF_COUNT" -gt 1 ]; then
    echo -e "  [$FAIL] Multiple SPF records found ($SPF_COUNT). Must have exactly one."
  else
    echo -e "  [$PASS] Single SPF record"
  fi
  if echo "$SPF" | grep -q "_spf.salesforce.com"; then
    echo -e "  [$PASS] Includes Salesforce (_spf.salesforce.com)"
  else
    echo -e "  [$FAIL] Missing Salesforce include. Add: include:_spf.salesforce.com"
  fi
  if echo "$SPF" | grep -q "spf.protection.outlook.com"; then
    echo -e "  [$PASS] Includes Microsoft 365 (spf.protection.outlook.com)"
  else
    echo -e "  [$WARN] Missing Microsoft 365 include"
  fi
  if echo "$SPF" | grep -qE '[-~?]all'; then
    echo -e "  [$PASS] Ends with all mechanism"
  else
    echo -e "  [$WARN] Missing -all or ~all terminator"
  fi
fi
echo ""

echo "--- DKIM (Salesforce) ---"
SF_CNAME=$(dig CNAME sf1._domainkey.$DOMAIN +short)
if [ -z "$SF_CNAME" ]; then
  echo -e "  [$FAIL] sf1._domainkey.$DOMAIN - No CNAME found"
else
  echo "  sf1._domainkey.$DOMAIN => $SF_CNAME"
  SF_TXT=$(dig TXT "$SF_CNAME" +short)
  if echo "$SF_TXT" | grep -q "v=DKIM1"; then
    echo -e "  [$PASS] sf1 DKIM key resolves with valid public key"
  else
    echo -e "  [$FAIL] sf1 DKIM key does not resolve to a valid DKIM record"
  fi
fi

SF2_CNAME=$(dig CNAME sf2._domainkey.$DOMAIN +short)
if [ -z "$SF2_CNAME" ]; then
  echo -e "  [$WARN] sf2._domainkey.$DOMAIN - No CNAME found (may not be needed if Salesforce only generated one selector)"
else
  echo "  sf2._domainkey.$DOMAIN => $SF2_CNAME"
fi
echo ""

echo "--- DKIM (Microsoft 365) ---"
for SEL in selector1 selector2; do
  SEL_CNAME=$(dig CNAME ${SEL}._domainkey.$DOMAIN +short)
  if [ -z "$SEL_CNAME" ]; then
    echo -e "  [$WARN] ${SEL}._domainkey.$DOMAIN - No CNAME"
  else
    echo -e "  [$PASS] ${SEL}._domainkey.$DOMAIN => $SEL_CNAME"
  fi
done
echo ""

echo "--- DMARC ---"
DMARC=$(dig TXT _dmarc.$DOMAIN +short)
if [ -z "$DMARC" ]; then
  echo -e "  [$FAIL] No DMARC record at _dmarc.$DOMAIN"
  echo "  Add TXT record: _dmarc.$DOMAIN => v=DMARC1; p=none; rua=mailto:dmarc@$DOMAIN"
else
  echo "  Record: $DMARC"
  echo -e "  [$PASS] DMARC record exists"
  if echo "$DMARC" | grep -q "p=none"; then
    echo -e "  [$WARN] Policy is p=none (monitoring only). Consider p=quarantine after confirming all senders pass."
  fi
fi
echo ""

echo "--- MX ---"
dig MX "$DOMAIN" +short | while read prio host; do
  echo "  $prio $host"
done
echo ""

echo "--- Salesforce Domain Verification ---"
SF_VERIFY=$(dig TXT "$DOMAIN" +short | grep "00D")
if [ -z "$SF_VERIFY" ]; then
  echo -e "  [$WARN] No Salesforce domain verification TXT record found"
else
  echo "  Verification record: $SF_VERIFY"
  echo -e "  [$PASS] Salesforce domain verification present"
fi
echo ""

echo "============================================"
echo " Summary: Review any FAIL/WARN items above"
echo "============================================"
