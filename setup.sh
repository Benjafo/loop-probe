#!/usr/bin/env bash
# One-time project setup: what a template repo can't carry.
#
# A template copy brings files and one branch. It brings no labels, no branch
# protection, no merge settings, no secrets, and Projects v2 live at the user
# level. Run this once, from your own terminal, in a fresh clone of the new
# repo, with your own `gh` (it needs the `project` scope; GITHUB_TOKEN can't
# touch user projects):
#
#   gh auth refresh -s project,repo,workflow
#   ./setup.sh
#
# In order (the order matters: the first repo write happens before protection):
#   1. labels                     from .github/labels.json
#   2. project board              Status field: Backlog, Ready, In Progress, Done
#   3. .claude/project.json       committed and pushed to development
#   4. production branch          created from development's current commit
#   5. rulesets + merge settings  on development and production
#   6. secrets and variables      CLAUDE_CODE_OAUTH_TOKEN, LOOP_APP_ID,
#                                 LOOP_APP_PRIVATE_KEY, LOOP_APP_SLUG
#   7. prints the manual steps    project UI toggles, preview host
#
# Re-runnable: each step skips what already exists.
set -euo pipefail

# ----------------------------------------------------------------- preflight
need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need gh; need git; need jq

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
DEFAULT="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)"
ME="$(gh api user --jq .login)"

echo "repo:    $REPO"
echo "default: $DEFAULT"
echo "user:    $ME"

if [ "$DEFAULT" != "development" ]; then
  echo "error: the default branch is '$DEFAULT', not 'development'. Set it in Settings → General before running this." >&2
  exit 1
fi
if [ "$OWNER" != "$ME" ]; then
  echo "error: this script is for user-owned repos (projects are created at the user level); owner is '$OWNER', you are '$ME'." >&2
  exit 1
fi
if ! gh auth status 2>&1 | grep -q "project"; then
  echo "warning: your gh token may lack the 'project' scope. If step 2 fails: gh auth refresh -s project" >&2
fi
git fetch -q origin development
git checkout -q development
git pull -q --ff-only origin development

# ------------------------------------------------------------------ 1. labels
echo; echo "== 1. labels"
jq -c '.[]' .github/labels.json | while read -r row; do
  n="$(jq -r .name <<<"$row")"; c="$(jq -r .color <<<"$row")"; d="$(jq -r .description <<<"$row")"
  if gh label create "$n" --color "$c" --description "$d" >/dev/null 2>&1; then
    echo "  created  $n"
  else
    gh label edit "$n" --color "$c" --description "$d" >/dev/null
    echo "  updated  $n"
  fi
done

# ----------------------------------------------------------------- 2. project
echo; echo "== 2. project board"
PROJECT_JSON=.claude/project.json
if [ -f "$PROJECT_JSON" ] && jq -e .project_id "$PROJECT_JSON" >/dev/null 2>&1; then
  echo "  $PROJECT_JSON exists; reusing project $(jq -r .project_number "$PROJECT_JSON")"
  PROJECT_NUMBER="$(jq -r .project_number "$PROJECT_JSON")"
else
  PROJECT_NUMBER="$(gh project create --owner "@me" --title "$NAME" --format json --jq .number)"
  echo "  created project #$PROJECT_NUMBER"
fi
# Link the project to the repo so it shows under the repo's Projects tab and
# auto-add can target it. Re-runnable; report a failure instead of hiding it.
LINK_FAILED=false
if gh project link "$PROJECT_NUMBER" --owner "@me" --repo "$REPO" >/dev/null 2>&1; then
  echo "  linked project #$PROJECT_NUMBER to $REPO"
else
  LINK_FAILED=true
  echo "  warning: could not link project #$PROJECT_NUMBER to $REPO (see manual steps at the end)"
fi
PROJECT_ID="$(gh project view "$PROJECT_NUMBER" --owner "@me" --format json --jq .id)"
STATUS_FIELD_ID="$(gh project field-list "$PROJECT_NUMBER" --owner "@me" --format json --jq '.fields[] | select(.name=="Status") | .id')"

# The built-in Status field ships with Todo / In Progress / Done. Replace its
# options with the four columns the loop uses. (gh has no subcommand for this;
# it is one GraphQL mutation, which your own token may run.)
gh api graphql -f query='
  mutation($fieldId: ID!) {
    updateProjectV2Field(input: {
      fieldId: $fieldId,
      singleSelectOptions: [
        {name: "Backlog",     color: GRAY,   description: "Written, not promoted. Costs nothing."},
        {name: "Ready",       color: BLUE,   description: "The queue. Promoting is the spend decision."},
        {name: "In Progress", color: YELLOW, description: "Dispatched, or answered and waiting for re-dispatch."},
        {name: "Done",        color: GREEN,  description: "Issue closed by a merged PR."}
      ]
    }) { projectV2Field { ... on ProjectV2SingleSelectField { id } } }
  }' -F fieldId="$STATUS_FIELD_ID" >/dev/null
echo "  Status options set: Backlog, Ready, In Progress, Done"

OPTS="$(gh project field-list "$PROJECT_NUMBER" --owner "@me" --format json --jq '.fields[] | select(.name=="Status") | .options')"
opt() { jq -r --arg n "$1" '.[] | select(.name==$n) | .id' <<<"$OPTS"; }

# --------------------------------------------------------- 3. project.json
echo; echo "== 3. .claude/project.json → development"
mkdir -p .claude
jq -n \
  --arg repo "$REPO" \
  --argjson number "$PROJECT_NUMBER" \
  --arg project_id "$PROJECT_ID" \
  --arg status_field_id "$STATUS_FIELD_ID" \
  --arg backlog "$(opt Backlog)" --arg ready "$(opt Ready)" --arg inprog "$(opt 'In Progress')" --arg done "$(opt Done)" \
  '{repo:$repo, project_number:$number, project_id:$project_id, status_field_id:$status_field_id,
    status_options:{backlog:$backlog, ready:$ready, in_progress:$inprog, done:$done}}' > "$PROJECT_JSON"
cat "$PROJECT_JSON"
if git diff --quiet -- "$PROJECT_JSON" && git ls-files --error-unmatch "$PROJECT_JSON" >/dev/null 2>&1; then
  echo "  unchanged"
else
  git add "$PROJECT_JSON"
  git commit -q -m "setup: record project ids in .claude/project.json"
  echo "  committed"
fi
# Push whatever is ahead, including a commit from an earlier run whose push failed
# (e.g. a stale HTTPS credential). A no-op when origin is already up to date.
if [ "$(git rev-list --count origin/development..HEAD)" -gt 0 ]; then
  git push -q origin development || {
    echo "error: push to origin failed. If this is an HTTPS auth error, switch the remote to SSH:" >&2
    echo "  git remote set-url origin git@github.com:$REPO.git && ./setup.sh" >&2
    exit 1
  }
  echo "  pushed"
fi

# -------------------------------------------------------- 4. production
echo; echo "== 4. production branch"
if gh api "repos/$REPO/branches/production" >/dev/null 2>&1; then
  echo "  exists"
else
  SHA="$(git rev-parse origin/development)"
  gh api -X POST "repos/$REPO/git/refs" -f ref=refs/heads/production -f sha="$SHA" >/dev/null
  echo "  created from development @ ${SHA:0:7}"
fi

# ----------------------------------------------------- 5. rulesets, merges
echo; echo "== 5. branch rules and merge settings"
# Repo-level merge settings: squash and merge-commit both allowed (per-branch
# choice is enforced by the rulesets below), rebase off, delete head on merge.
gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true -F allow_merge_commit=true -F allow_rebase_merge=false \
  -F allow_auto_merge=false -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY \
  -f merge_commit_title=PR_TITLE -f merge_commit_message=PR_BODY >/dev/null
echo "  merge settings applied"

ruleset() { # name, branch, merge method, status checks (json array)
  local name="$1" branch="$2" method="$3" checks="$4"
  local existing
  existing="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$name\") | .id" 2>/dev/null || true)"
  local body
  body="$(jq -n --arg name "$name" --arg branch "$branch" --arg method "$method" --argjson checks "$checks" '{
    name: $name, target: "branch", enforcement: "active",
    bypass_actors: [],
    conditions: { ref_name: { include: ["refs/heads/\($branch)"], exclude: [] } },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "pull_request", parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
          allowed_merge_methods: [$method] } },
      { type: "required_status_checks", parameters: {
          strict_required_status_checks_policy: false,
          do_not_enforce_on_create: true,
          required_status_checks: $checks } }
    ] }')"
  if [ -n "$existing" ]; then
    gh api -X PUT "repos/$REPO/rulesets/$existing" --input - <<<"$body" >/dev/null
    echo "  updated ruleset '$name'"
  else
    gh api -X POST "repos/$REPO/rulesets" --input - <<<"$body" >/dev/null
    echo "  created ruleset '$name'"
  fi
}
# development: PR required, squash only, ci and CodeQL must pass, no force push, no delete.
ruleset "development" development squash '[{"context":"ci"},{"context":"CodeQL"}]'
# production: PR required (the release PR), merge commit only, ci must pass.
ruleset "production" production merge '[{"context":"ci"}]'

# -------------------------------------------------------------- 6. secrets
echo; echo "== 6. secrets and variables"
has_secret() { gh secret list --json name --jq '.[].name' | grep -qx "$1"; }
has_var()    { gh variable list --json name --jq '.[].name' | grep -qx "$1"; }

if has_secret CLAUDE_CODE_OAUTH_TOKEN; then
  echo "  CLAUDE_CODE_OAUTH_TOKEN exists (rotate yearly: claude setup-token, then gh secret set CLAUDE_CODE_OAUTH_TOKEN)"
else
  echo "  Run 'claude setup-token' in another terminal and paste the token:"
  gh secret set CLAUDE_CODE_OAUTH_TOKEN
fi

if has_secret LOOP_APP_ID && has_secret LOOP_APP_PRIVATE_KEY && has_var LOOP_APP_SLUG; then
  echo "  LOOP_APP_ID, LOOP_APP_PRIVATE_KEY, LOOP_APP_SLUG exist"
else
  echo "  Your GitHub App (Contents, Pull requests, Issues, Workflows: read & write), installed on this repo."
  read -r -p "  App ID: " APP_ID
  read -r -p "  App slug (from the app's URL, github.com/apps/<slug>): " APP_SLUG
  read -r -p "  Path to the private key .pem: " APP_KEY
  gh secret set LOOP_APP_ID --body "$APP_ID"
  gh secret set LOOP_APP_PRIVATE_KEY < "$APP_KEY"
  gh variable set LOOP_APP_SLUG --body "$APP_SLUG"
  echo "  set"
fi

# ---------------------------------------------------------------- 7. manual
cat <<EOF

== 7. done. The project's UI toggles have no API; do them by hand:

  https://github.com/users/$ME/projects/$PROJECT_NUMBER/workflows
    • Auto-add to project: on, for this repo, filter "is:issue" (hand-written issues land
      in Backlog; /plan adds its own and sets Backlog itself; PRs stay off the board)
    • Item closed → set Status: Done
    • Pull request linked → set Status: In review  (add the "In review" option to the
      Status field first, between In Progress and Done; the skills never set it, so
      .claude/project.json needs no change)
    • Pull request merged → set Status: Done  (redundant with Item closed via Closes #N,
      harmless)
    Note: nothing moves a card back out of In review. On close-and-reissue, drag the
    card to Ready yourself as part of rewriting the issue.
  https://github.com/users/$ME/projects/$PROJECT_NUMBER
    • Optional: + New view → Board, to see Status as columns. The loop reads the Status
      field, not a view, so the default table works too.
EOF
if [ "$LINK_FAILED" = true ]; then
  cat <<EOF
    • Link the project to the repo (the script could not): $REPO → Projects tab →
      "Link a project" → pick "$NAME".
EOF
fi
cat <<EOF

Then:
  • Preview host: connect the repo, set 'production' as the production branch, and
    confirm it deploys branches whose commits are authored by ${APP_SLUG:-your app}[bot].
  • Confirm the GitHub App is installed on $REPO (Settings → GitHub Apps). Do not run
    /install-github-app; it would install a second app and write a second claude.yml.
  • claude --model fable, then /bootstrap.
EOF
