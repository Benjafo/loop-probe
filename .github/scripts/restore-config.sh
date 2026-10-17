#!/usr/bin/env bash
# Revision runs only (claude.yml). On any pull_request context the Action
# restores these config paths from the base branch and leaves them as unstaged
# changes against the PR head. Left alone, a WIP commit or a `git add -A`
# would silently write the base versions back and erase a CLAUDE.md or rules
# proposal from the PR's diff. So before any git command that moves HEAD
# (commit, rebase, merge) we put the tree back to the PR head's versions.
#
# Run from the repo root. Does not stash: a stash-and-pop would carry the base
# versions into a later commit.
set -euo pipefail

PATHS=(.claude .mcp.json .claude.json .gitmodules .ripgreprc CLAUDE.md CLAUDE.local.md .husky)

for p in "${PATHS[@]}"; do
  # Back to the PR head's version where one exists; ignore paths HEAD lacks.
  git checkout HEAD -- "$p" 2>/dev/null || true
  # The restore recreates a file the PR deleted, and a checkout leaves it untracked.
  git clean -fdq -- "$p" 2>/dev/null || true
done
# The Action keeps the PR-authored versions here for reference; never commit it.
rm -rf .claude-pr
echo "config paths restored to the PR head"
