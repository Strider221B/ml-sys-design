#!/usr/bin/env bash
set -e

# Activate Python virtual environment if present
if [ -f "$HOME/python_envs/p313_llm/bin/activate" ]; then
  # shellcheck source=/dev/null
  source "$HOME/python_envs/p313_llm/bin/activate"
fi

npx tsx scripts/local_ci_runner.ts "$@"

