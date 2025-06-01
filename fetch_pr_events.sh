#!/usr/bin/env bash
set -euo pipefail

# Script: fetch_pr_events.sh
# Reads pull requests via GitHub CLI and fetches scroll-tracker metadata for each variant

# Endpoint for fetching events (supports optional VARIANT query param)
ENDPOINT="https://b9himymqn4.execute-api.us-west-1.amazonaws.com/Prod/events"

# Ensure dependencies
for cmd in gh curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

echo "Fetching PR list from GitHub..."
# Fetch all open PRs (number, head branch, title)
prs_json=$(gh pr list --state open --json number,headRefName,title)

# Parse and iterate
count=$(jq 'length' <<< "$prs_json")
if [ "$count" -eq 0 ]; then
  echo "No open pull requests found."
  exit 0
fi

jq -c '.[]' <<< "$prs_json" | while read -r pr; do
  num=$(jq -r '.number'  <<< "$pr")
  branch=$(jq -r '.headRefName' <<< "$pr")
  title=$(jq -r '.title'       <<< "$pr")
  echo
  echo "PR #$num ($branch): $title"
  echo "GET $ENDPOINT?variant=$branch"
  # Fetch events for this variant
  resp=$(curl -s "${ENDPOINT}?variant=${branch}")
  echo "$resp" | jq '.'
done
