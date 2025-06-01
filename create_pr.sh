#!/usr/bin/env bash
set -euo pipefail

# Usage: create_pr.sh [head_branch] [base_branch] [title] [body]
if ! command -v gh &>/dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Install from https://cli.github.com/" >&2
  exit 1
fi

# Determine branches
HEAD_BRANCH=${1:-$(git rev-parse --abbrev-ref HEAD)}
BASE_BRANCH=${2:-main}

# Default title and body
DEFAULT_TITLE="Auto PR: ${HEAD_BRANCH} → ${BASE_BRANCH}"
DEFAULT_BODY="Automatic pull request merging '${HEAD_BRANCH}' into '${BASE_BRANCH}'."
PR_TITLE=${3:-"$DEFAULT_TITLE"}
PR_BODY=${4:-"$DEFAULT_BODY"}

echo "Creating pull request from '$HEAD_BRANCH' into '$BASE_BRANCH'..."
gh pr create \
  --base "$BASE_BRANCH" \
  --head "$HEAD_BRANCH" \
  --title "$PR_TITLE" \
  --body "$PR_BODY"