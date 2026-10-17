#!/usr/bin/env bash
# The always() step. Owns the failure path, because a run killed by max-turns
# or the step timeout never reaches `gh pr create`, and (build mode only) the
# label bookkeeping that runs after every run, success included.
#
# MODE=build  (claude-issues.yml): both halves.
#   failure half, only when OUTCOME != success:
#     comment on the issue first (so a trail exists even if the rest fails),
#     re-point origin at this step's own token, commit any dirty tree as WIP,
#     convert an existing ready PR to draft, push, open a draft PR with
#     "Closes #N" if the branch is ahead and no PR exists.
#   label half, always:
#     back-fill the issue's attribute labels onto the PR, remove `claude`,
#     add `needs-input` when no ready PR came out of this run, clear it when
#     one did.
# MODE=revise (claude.yml): failure half only, commenting on the PR; config
#   paths are restored to the PR head before any HEAD-moving git command.
#
# Needs: GH_TOKEN (a token minted by this step, not the Action's), GH_REPO,
#        MODE, OUTCOME, CLAUDE_BRANCH, RUN_URL, and ISSUE_NUMBER + ISSUE_TITLE
#        + ATTR_LABELS (build) or PR_NUMBER (revise).
set -uo pipefail

ok() { echo "after-run: $*"; }
warn() { echo "::warning::after-run: $*"; }

git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git"
git fetch -q origin development || warn "could not fetch development"

branch_exists() { git rev-parse --verify -q "$CLAUDE_BRANCH" >/dev/null; }
ahead_count() { git rev-list --count "origin/development..${CLAUDE_BRANCH}" 2>/dev/null || echo 0; }
open_pr_json() { gh pr list --state open --head "$CLAUDE_BRANCH" --json number,isDraft --jq '.[0] // empty'; }

# ---------------------------------------------------------------- failure half
if [ "$OUTCOME" != "success" ]; then
  ok "run outcome was '$OUTCOME': running the failure half"
  LOG="$(git log --oneline "origin/development..${CLAUDE_BRANCH}" 2>/dev/null | head -20)"
  DIRTY="$(git status --porcelain | head -40)"
  TRAIL="The implementing run did not finish cleanly (outcome: \`${OUTCOME}\`).

Run: ${RUN_URL}

Commits on \`${CLAUDE_BRANCH}\` so far:
\`\`\`
${LOG:-(none)}
\`\`\`
Uncommitted changes at the time it stopped (pushed as a WIP commit if any):
\`\`\`
${DIRTY:-(none)}
\`\`\`
Where it stuck: see the run log above. A draft PR is opened below when the branch has commits."

  if [ "$MODE" = "build" ]; then
    gh issue comment "$ISSUE_NUMBER" --body "$TRAIL" || warn "issue comment failed"
  else
    gh pr comment "$PR_NUMBER" --body "$TRAIL" || warn "PR comment failed"
    bash .github/scripts/restore-config.sh || warn "restore-config failed"
  fi

  if branch_exists; then
    git checkout -q "$CLAUDE_BRANCH" 2>/dev/null || true
    if [ -n "$(git status --porcelain)" ]; then
      if [ "$MODE" = "build" ]; then
        git add -A
      else
        # Never `add -A` on a revision run; the restore above handled config.
        git add -A -- . ':!.claude-pr'
      fi
      git commit -q -m "WIP: run stopped (${OUTCOME}) ${RUN_URL}" && ok "WIP commit made" || warn "WIP commit failed"
    fi

    PR="$(open_pr_json)"
    if [ -n "$PR" ] && [ "$(echo "$PR" | jq -r .isDraft)" = "false" ]; then
      NUM="$(echo "$PR" | jq -r .number)"
      ok "converting ready PR #$NUM to draft before pushing"
      gh pr ready --undo "$NUM" || warn "could not convert #$NUM to draft"
    fi

    if [ "$(ahead_count)" -gt 0 ]; then
      git push -q origin "$CLAUDE_BRANCH" && ok "pushed $CLAUDE_BRANCH" || warn "push failed"
      if [ -z "$PR" ] && [ "$MODE" = "build" ]; then
        BODY="Closes #${ISSUE_NUMBER}

Draft opened by the failure step: the run stopped with outcome \`${OUTCOME}\` before it could open a PR. See the issue comment and the run log for what was tried and where it stuck.

Run: ${RUN_URL}"
        gh pr create --draft --base development --head "$CLAUDE_BRANCH" \
          --title "WIP #${ISSUE_NUMBER}: ${ISSUE_TITLE}" --body "$BODY" \
          && ok "draft PR opened" || warn "draft PR creation failed"
      fi
    else
      ok "branch has no commits ahead of development: nothing to push"
    fi
  else
    ok "no branch was created: comment only"
  fi
else
  ok "run succeeded: failure half skipped"
fi

# ------------------------------------------------------------------ label half
if [ "$MODE" = "build" ]; then
  PR="$(open_pr_json)"
  if [ -n "$PR" ] && [ -n "${ATTR_LABELS:-}" ]; then
    NUM="$(echo "$PR" | jq -r .number)"
    IFS=',' read -ra LBL <<< "$ATTR_LABELS"
    for l in "${LBL[@]}"; do
      l="$(echo "$l" | xargs)"; [ -z "$l" ] && continue
      gh pr edit "$NUM" --add-label "$l" >/dev/null || warn "could not add $l to #$NUM"
    done
    ok "attribute labels back-filled onto #$NUM"
  fi

  gh issue edit "$ISSUE_NUMBER" --remove-label claude >/dev/null 2>&1 || true
  ok "removed 'claude' from #$ISSUE_NUMBER"

  if [ -n "$PR" ] && [ "$(echo "$PR" | jq -r .isDraft)" = "false" ]; then
    gh issue edit "$ISSUE_NUMBER" --remove-label needs-input >/dev/null 2>&1 || true
    ok "ready PR exists: cleared 'needs-input'"
  else
    gh issue edit "$ISSUE_NUMBER" --add-label needs-input >/dev/null || warn "could not add needs-input"
    ok "no ready PR from this run: added 'needs-input'"
  fi
fi
