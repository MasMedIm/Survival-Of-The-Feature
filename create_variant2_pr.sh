#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [ ! -x "$SCRIPT_DIR/create_pr.sh" ]; then
  echo "Error: create_pr.sh not found or not executable in $SCRIPT_DIR" >&2
  exit 1
fi

PREVIEW_URL="http://survival-of-the-feature-variants-672656625611.s3-website-us-west-1.amazonaws.com/variant-2/"
TITLE="Variant-2 Preview"

"$SCRIPT_DIR/create_pr.sh" variant-2 main "$TITLE" "$PREVIEW_URL"