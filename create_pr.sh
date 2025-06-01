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

# Ensure local branch exists
if ! git show-ref --verify --quiet refs/heads/"$HEAD_BRANCH"; then
  echo "Error: branch '$HEAD_BRANCH' does not exist locally." >&2
  exit 1
fi

# Default title and body
DEFAULT_TITLE="Auto PR: ${HEAD_BRANCH} → ${BASE_BRANCH}"
DEFAULT_BODY="Automatic pull request merging '${HEAD_BRANCH}' into '${BASE_BRANCH}'."
PR_TITLE=${3:-"$DEFAULT_TITLE"}
PR_BODY=${4:-"$DEFAULT_BODY"}

echo "Preparing pull request from '$HEAD_BRANCH' into '$BASE_BRANCH'..."

# Check commit differences
if [ "$(git rev-list --count "$BASE_BRANCH".."$HEAD_BRANCH")" -eq 0 ]; then
  echo "Error: no commits to merge from '$HEAD_BRANCH' into '$BASE_BRANCH'." >&2
  exit 1
fi

# Push branch if not on remote
if ! git ls-remote --exit-code --heads origin "$HEAD_BRANCH" &>/dev/null; then
  echo "Pushing branch '$HEAD_BRANCH' to origin..."
  git push -u origin "$HEAD_BRANCH"
fi

echo "Creating pull request on GitHub..."
gh pr create \
  --base "$BASE_BRANCH" \
  --head "$HEAD_BRANCH" \
  --title "$PR_TITLE" \
  --body "$PR_BODY"