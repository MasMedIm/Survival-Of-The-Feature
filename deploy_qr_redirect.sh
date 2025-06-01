#!/usr/bin/env bash
set -euo pipefail

# Load AWS credentials and configuration from .env
set -a
source .env
set +a

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_REGION:-}" || -z "${AWS_ACCOUNT_ID:-}" ]]; then
  echo "Please define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_ACCOUNT_ID in .env" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="$AWS_REGION"

# Bucket and redirect path
BUCKET="survival-of-the-feature-variants-${AWS_ACCOUNT_ID}"
REGION="$AWS_REGION"
WEBSITE_DOMAIN="${BUCKET}.s3-website-${REGION}.amazonaws.com"
REDIRECT_PATH="redirect"
REDIRECT_URL="http://${WEBSITE_DOMAIN}/${REDIRECT_PATH}/"

# Variant URLs array
VARIANTS=(
  "http://${WEBSITE_DOMAIN}/main/"
  "http://${WEBSITE_DOMAIN}/variant-1/"
  "http://${WEBSITE_DOMAIN}/variant-2/"
)

# Build temporary redirect HTML
TMP_HTML=$(mktemp)
cat > "$TMP_HTML" <<EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Random Variant Redirect</title>
  <script>
    (function(){
      var variants = [
      $(for url in "${VARIANTS[@]}"; do
          printf '        "%s",\n' "$url"
      done | sed '$ s/,$//')
      ];
      var pick = variants[Math.floor(Math.random()*variants.length)];
      window.location.replace(pick);
    })();
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${VARIANTS[0]}">
  </noscript>
</head>
<body>
  Redirecting… if nothing happens <a href="${VARIANTS[0]}">click here</a>.
</body>
</html>
EOF

echo "Uploading redirect page to s3://${BUCKET}/${REDIRECT_PATH}/index.html"
aws s3 cp "$TMP_HTML" "s3://${BUCKET}/${REDIRECT_PATH}/index.html" --content-type text/html

echo "Removing temporary file"
rm "$TMP_HTML"

echo "Redirect URL: ${REDIRECT_URL}"

echo "Generating QR code image as random-redirect-qr.png"
if command -v qrencode >/dev/null 2>&1; then
  echo "  - qrencode found, generating locally"
  printf "%s" "$REDIRECT_URL" | qrencode -o random-redirect-qr.png -t PNG
elif command -v python3 >/dev/null 2>&1; then
  echo "  - qrencode not found, falling back to QuickChart.io"
  ENC=$(python3 - <<PYTHON
import urllib.parse
print(urllib.parse.quote("${REDIRECT_URL}", safe=""))
PYTHON
  )
  curl -s "https://quickchart.io/qr?size=300&text=${ENC}" -o random-redirect-qr.png
else
  echo "Error: no qrencode or python3 available for QR generation" >&2
  exit 1
fi

echo "Done. Scan random-redirect-qr.png to be randomly redirected to one of your variants."