#!/usr/bin/env bash
set -euo pipefail

# Read instructions from instruction.md and call codex CLI
INSTR_FILE="instruction_b.md"

if [[ ! -f "$INSTR_FILE" ]]; then
  echo "Error: instruction file '$INSTR_FILE' not found." >&2
  exit 1
fi

INSTR_CONTENT=$(< "$INSTR_FILE")

codex --dangerously-auto-approve-everything --model o4-mini --full-stdout -q "$INSTR_CONTENT"
