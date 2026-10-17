#!/usr/bin/env bash
# Resolve the GitHub App's bot login and numeric user id so every commit and
# comment a run makes is one identity (the preview host keys on it too).
#
# Needs: GH_TOKEN (any token), APP_SLUG (from create-github-app-token's
# app-slug output). Writes bot_name and bot_id to $GITHUB_OUTPUT.
set -euo pipefail

BOT_NAME="${APP_SLUG}[bot]"
BOT_ID="$(gh api "/users/${BOT_NAME}" --jq .id)"
echo "bot identity: ${BOT_NAME} (${BOT_ID})"
{
  echo "bot_name=${BOT_NAME}"
  echo "bot_id=${BOT_ID}"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"

# Git identity for commits made by scripts in this job (the Action sets its own).
git config --global user.name "${BOT_NAME}"
git config --global user.email "${BOT_ID}+${BOT_NAME}@users.noreply.github.com"
