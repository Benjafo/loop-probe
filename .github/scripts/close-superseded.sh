#!/usr/bin/env bash
# Pre-step of a build run: close any open PR the app opened for the same issue
# (an earlier draft, say) with a "superseded" comment, so the issue has one
# live PR at a time. /dispatch skips issues with an open app PR, so this only
# fires on a deliberate hand re-label.
#
# Needs: GH_TOKEN (app token), GH_REPO, ISSUE_NUMBER, BOT_NAME, RUN_URL.
set -euo pipefail

mapfile -t PRS < <(gh pr list --state open --author "$BOT_NAME" --json number,headRefName \
  --jq ".[] | select(.headRefName | test(\"^claude/issue-${ISSUE_NUMBER}-\")) | .number")

for pr in "${PRS[@]:-}"; do
  [ -z "$pr" ] && continue
  echo "closing superseded PR #$pr"
  gh pr comment "$pr" --body "Superseded by a new run for #${ISSUE_NUMBER}: ${RUN_URL}"
  gh pr close "$pr"
done
