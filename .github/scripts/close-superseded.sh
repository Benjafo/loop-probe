#!/usr/bin/env bash
# Pre-step of a build run: close any open PR the app opened for the same issue
# (an earlier draft, say) with a "superseded" comment, so the issue has one
# live PR at a time, then delete its branch. delete_branch_on_merge only
# fires on merges, so without this every superseded draft would leave a
# claude/* branch behind; the closed PR keeps its commits and diff viewable.
# /dispatch skips issues with an open app PR, so this only fires on a
# deliberate hand re-label.
#
# Needs: GH_TOKEN (app token), GH_REPO, ISSUE_NUMBER, BOT_NAME, RUN_URL.
set -euo pipefail

mapfile -t PRS < <(gh pr list --state open --author "$BOT_NAME" --json number,headRefName \
  --jq ".[] | select(.headRefName | test(\"^claude/issue-${ISSUE_NUMBER}-\")) | \"\\(.number) \\(.headRefName)\"")

for entry in "${PRS[@]:-}"; do
  [ -z "$entry" ] && continue
  pr="${entry%% *}"
  branch="${entry#* }"
  echo "closing superseded PR #$pr ($branch)"
  gh pr comment "$pr" --body "Superseded by a new run for #${ISSUE_NUMBER}: ${RUN_URL}"
  gh pr close "$pr"
  gh api -X DELETE "repos/${GH_REPO}/git/refs/heads/${branch}" \
    || echo "could not delete $branch (left in place)"
done
