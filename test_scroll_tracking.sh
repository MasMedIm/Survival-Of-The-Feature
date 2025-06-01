#!/usr/bin/env bash
set -euo pipefail

# Load AWS credentials and configuration
set -a; source .env; set +a

# Required env vars
for var in AWS_REGION AWS_ACCOUNT_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "Please set $var in .env" >&2; exit 1
  fi
done
export AWS_DEFAULT_REGION="$AWS_REGION"

STACK_NAME="scroll-tracker"
FUNCTION_NAME="ScrollTrackerFunction-${STACK_NAME}"

echo "==> Generating test payload"
sessionId=$(command -v uuidgen >/dev/null 2>&1 && uuidgen || echo "sess-$(date +%s)" )
ts=$(date +%s)
body_json=$(jq -c -n --arg v "main" --arg sessionId "$sessionId" \
  --argjson maxDepth 50 --argjson ts "$ts" \
  '{variant: $v, sessionId: $sessionId, maxDepth: $maxDepth, ts: $ts}')
payload=$(jq -c -n --arg b "$body_json" '{body: $b}')

echo "Payload: $payload"

echo; echo "==> Invoking Lambda: $FUNCTION_NAME"
# Invoke and capture LogResult
LOG_RESULT=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload "$payload" \
  --log-type Tail \
  test_response.json \
  --query 'LogResult' --output text)

# Decode logs
echo; echo "==> Lambda logs:"; echo
if [[ "$(uname)" == "Darwin" ]]; then
  echo "$LOG_RESULT" | base64 -D
else
  echo "$LOG_RESULT" | base64 --decode
fi

echo; echo "==> Lambda response payload:"; cat test_response.json; echo

echo; echo "==> Testing API Gateway endpoint"
# Fetch the API URL from CloudFormation outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)
echo "POST $API_URL"
curl -s -w "\nHTTP status: %{http_code}\n" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$body_json"
echo
echo "Done."