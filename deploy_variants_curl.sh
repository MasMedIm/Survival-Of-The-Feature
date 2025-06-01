#!/usr/bin/env bash
set -euo pipefail

# Load AWS credentials and configuration from .env
set -o allexport; source .env; set +o allexport

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_REGION:-}" || -z "${AWS_ACCOUNT_ID:-}" ]]; then
  echo "Please define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_ACCOUNT_ID in .env" >&2
  exit 1
fi

# Bucket and region configuration
BUCKET="survival-of-the-feature-variants-${AWS_ACCOUNT_ID}"
REGION="${AWS_REGION}"
SERVICE="s3"

if [[ "${REGION}" == "us-east-1" ]]; then
  S3_HOST="s3.amazonaws.com"
else
  S3_HOST="s3.${REGION}.amazonaws.com"
fi
ENDPOINT="https://${S3_HOST}"

# Timestamps for SigV4
amz_date=$(date -u +'%Y%m%dT%H%M%SZ')
date_stamp=$(date -u +'%Y%m%d')

# SigV4 signing helper functions
sign() {
  printf '%s' "$2" | openssl dgst -binary -sha256 -hmac "$1"
}
calculate_signature_key() {
  local kSecret="AWS4${AWS_SECRET_ACCESS_KEY}"
  local kDate=$(sign "$kSecret" "$date_stamp")
  local kRegion=$(sign "$kDate" "$REGION")
  local kService=$(sign "$kRegion" "$SERVICE")
  local kSigning=$(sign "$kService" "aws4_request")
  printf '%s' "$kSigning"
}

# Send a SigV4 signed HTTP request via curl
send_request() {
  local method=$1
  local url=$2
  local payload=$3
  local content_type=${4:-}
  local query_string=${5:-}

  local host_header=$(echo "$url" | awk -F/ '{print $3}')
  local uri=$(echo "$url" | sed -e "s|^[^/]*//[^/]*/||" -e "s|\?.*$||")
  local canonical_query="${query_string:-$(echo "$url" | grep -oP '(?<=\?).*' || true)}"

  local payload_hash
  if [[ -n "$payload" ]]; then
    payload_hash=$(printf '%s' "$payload" | openssl dgst -binary -sha256 | xxd -p -c 256)
  else
    payload_hash=$(printf '' | openssl dgst -binary -sha256 | xxd -p -c 256)
  fi

  local canonical_headers="host:${host_header}\nx-amz-content-sha256:${payload_hash}\nx-amz-date:${amz_date}\n"
  local signed_headers="host;x-amz-content-sha256;x-amz-date"
  if [[ -n "$content_type" ]]; then
    canonical_headers="content-type:${content_type}\n${canonical_headers}"
    signed_headers="content-type;${signed_headers}"
  fi

  local canonical_request="${method}\n/${uri}\n${canonical_query}\n${canonical_headers}\n${signed_headers}\n${payload_hash}"
  local credential_scope="${date_stamp}/${REGION}/${SERVICE}/aws4_request"
  local string_to_sign="AWS4-HMAC-SHA256\n${amz_date}\n${credential_scope}\n$(printf '%s' "$canonical_request" | openssl dgst -binary -sha256 | xxd -p -c 256)"
  local signing_key=$(calculate_signature_key)
  local signature=$(printf '%s' "$string_to_sign" | openssl dgst -binary -sha256 -hmac "$signing_key" | xxd -p -c 256)

  local authorization_header="AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credential_scope}, SignedHeaders=${signed_headers}, Signature=${signature}"
  local headers=(-H "Authorization: ${authorization_header}" -H "x-amz-date: ${amz_date}" -H "x-amz-content-sha256: ${payload_hash}")
  if [[ -n "$content_type" ]]; then
    headers+=(-H "Content-Type: ${content_type}")
  fi

  if [[ "$method" == "PUT" || "$method" == "POST" ]]; then
    curl -s -X "$method" "${headers[@]}" --data "$payload" "$url"
  else
    curl -s -X "$method" "${headers[@]}" "$url"
  fi
}

echo "1) Creating S3 bucket: ${BUCKET}"
if [[ "${REGION}" == "us-east-1" ]]; then
  create_payload=""
else
  create_payload="<?xml version=\"1.0\" encoding=\"UTF-8\"?><CreateBucketConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><LocationConstraint>${REGION}</LocationConstraint></CreateBucketConfiguration>"
fi
send_request "PUT" "${ENDPOINT}/${BUCKET}" "$create_payload" "application/xml" ""

echo "2) Enabling static website hosting"
website_payload="<?xml version=\"1.0\" encoding=\"UTF-8\"?><WebsiteConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><IndexDocument><Suffix>index.html</Suffix></IndexDocument><ErrorDocument><Key>index.html</Key></ErrorDocument></WebsiteConfiguration>"
send_request "PUT" "${ENDPOINT}/${BUCKET}?website" "$website_payload" "application/xml" "website"

echo "3) Applying public-read bucket policy"
policy=$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::${BUCKET}/*"}]}
EOF
)
send_request "PUT" "${ENDPOINT}/${BUCKET}?policy" "$policy" "application/json" "policy"

echo "4) Uploading index.html for branches: main, variant-1, variant-2"
for branch in main variant-1 variant-2; do
  git checkout "$branch"
  echo "  - $branch"
  file_payload=$(<index.html)
  send_request "PUT" "${ENDPOINT}/${BUCKET}/${branch}/index.html" "$file_payload" "text/html" ""
done

echo -e "\nYour variant URLs:"
for branch in main variant-1 variant-2; do
  echo "  • ${branch} → http://${BUCKET}.s3-website-${REGION}.amazonaws.com/${branch}/"
done