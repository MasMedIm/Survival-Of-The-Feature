#!/usr/bin/env bash
set -euo pipefail

# Load AWS credentials and configuration from .env
set -a
source .env
set +a

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_REGION:-}" || -z "${DEPLOY_S3_BUCKET:-}" ]]; then
  echo "Please define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and DEPLOY_S3_BUCKET in .env" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="$AWS_REGION"

STACK_NAME="scroll-tracker"
TEMPLATE="template.yaml"
PACKAGED="packaged.yaml"

# If a previous deployment ended in ROLLBACK_COMPLETE, delete the old stack to allow recreation
prev_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo NONE)
if [[ "$prev_status" == "ROLLBACK_COMPLETE" ]]; then
  echo "Previous stack '$STACK_NAME' is in ROLLBACK_COMPLETE. Deleting it..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME"
  echo "Waiting for stack delete to complete..."
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"
  echo "Deleted old stack, proceeding with fresh deployment."
fi

# Ensure Lambda code dependencies are installed
if [[ -f "scroll_tracker/package.json" ]]; then
  echo "Installing Lambda dependencies..."
  (cd scroll_tracker && npm install --production)
else
  echo "scroll_tracker/package.json not found, skipping npm install"
fi

echo "Packaging CloudFormation template..."
aws cloudformation package \
  --template-file "$TEMPLATE" \
  --s3-bucket "$DEPLOY_S3_BUCKET" \
  --output-template-file "$PACKAGED"

echo "Deploying CloudFormation stack: $STACK_NAME..."
aws cloudformation deploy \
  --template-file "$PACKAGED" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM

# Retrieve the API URL from CloudFormation outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "API endpoint for tracking: $API_URL"
echo
echo "Testing with curl..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"variant":"main","sessionId":"test-session","maxDepth":50,"ts":'"$(date +%s)"'}'

echo; echo "Done."
echo; echo "Retrieving Events API URL for GET /events"
EVENTS_API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`EventsApiUrl`].OutputValue' \
  --output text)
echo "Events API endpoint: $EVENTS_API_URL"
echo; echo "Testing GET all events"
curl -s -w "\nHTTP status: %{http_code}\n" "$EVENTS_API_URL"
echo; echo "Testing GET filtered by variant=main"
curl -s -w "\nHTTP status: %{http_code}\n" "$EVENTS_API_URL?variant=main"
echo
echo "Done."