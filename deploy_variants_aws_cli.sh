#!/usr/bin/env bash
set -euo pipefail

# Load AWS credentials and configuration from .env
set -a
source .env
set +a

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_REGION:-}" ]]; then
  echo "Please define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in .env" >&2
  exit 1
fi

export AWS_DEFAULT_REGION=${AWS_REGION}


# Bucket configuration
BUCKET="survival-of-the-feature-variants-${AWS_ACCOUNT_ID}"
REGION="${AWS_REGION}"

# Create bucket if it doesn't exist
if ! aws s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "Creating S3 bucket: ${BUCKET}"
  if [[ "${REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${BUCKET}"
  else
    aws s3api create-bucket --bucket "${BUCKET}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi
else
  echo "Bucket ${BUCKET} already exists, skipping creation"
fi

echo "Configuring static website hosting"
aws s3api put-bucket-website --bucket "${BUCKET}" --website-configuration '{
  "IndexDocument": { "Suffix": "index.html" },
  "ErrorDocument": { "Key": "index.html" }
}'

# Disable Block Public Access settings so we can apply a public bucket policy
echo "Disabling Block Public Access settings on bucket: ${BUCKET}"
aws s3api put-public-access-block --bucket "${BUCKET}" \
  --public-access-block-configuration '{"BlockPublicAcls":false,"IgnorePublicAcls":false,"BlockPublicPolicy":false,"RestrictPublicBuckets":false}'

echo "Applying public-read bucket policy"
aws s3api put-bucket-policy --bucket "${BUCKET}" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::${BUCKET}/*\"
  }]
}"

echo "Uploading index.html for branches: main, variant-1, variant-2"
# Upload each variant’s index.html (with injected tracker) and the tracking script
for branch in main variant-1 variant-2; do
  echo "  - $branch"
  # Extract the branch's index.html from Git, inject the tracker snippet, and upload
  TMP_ORIG=$(mktemp)
  git show "${branch}:index.html" > "$TMP_ORIG"
  TMP_INDEX=$(mktemp)
  awk '/<\/body>/{print "    <script src=\"scroll-tracker.js\"></script>"}1' "$TMP_ORIG" > "$TMP_INDEX"
  aws s3 cp "$TMP_INDEX" "s3://${BUCKET}/${branch}/index.html" --content-type text/html
  rm "$TMP_ORIG" "$TMP_INDEX"
  # Upload the tracker script itself
  aws s3 cp scroll-tracker.js "s3://${BUCKET}/${branch}/scroll-tracker.js" --content-type application/javascript
done

echo
echo "Your variant URLs:"
for branch in main variant-1 variant-2; do
  echo "  • ${branch} → http://${BUCKET}.s3-website-${REGION}.amazonaws.com/${branch}/"
done

echo
echo "Testing variant GET (HTTP status codes):"
for branch in main variant-1 variant-2; do
  url="http://${BUCKET}.s3-website-${REGION}.amazonaws.com/${branch}/"
  printf "%-10s %s → " "${branch}" "${url}"
  if status=$(curl -s -o /dev/null -w "%{http_code}" "${url}"); then
    echo "${status}"
  else
    echo "curl failed"
  fi
done