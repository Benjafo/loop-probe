#!/usr/bin/env bash
# Assemble the run prompt from a template in .claude/prompts/ and the issue or
# PR data. Agent mode injects nothing, so this is how the issue reaches Claude.
#
# Only comments by the repo owner or the app are included: on a public repo
# anyone can comment between labeling and run start, and this is one of the two
# gates that keep a stranger's text away from a token with write permissions.
#
# Needs: GH_TOKEN, GH_REPO, TEMPLATE (path), OWNER, BOT_NAME, CLAUDE_BRANCH,
#        and either ISSUE_NUMBER (build) or PR_NUMBER + COMMENT_BODY (revision).
# Optional: MODEL, EFFORT, ADVISOR, RISK_HIGH, ATTR_LABELS, RUN_URL.
# Writes the prompt to $RUNNER_TEMP/prompt.md and sets outputs `path` and `text`.
set -euo pipefail

OUT="${RUNNER_TEMP:-/tmp}/prompt.md"

if [ -n "${ISSUE_NUMBER:-}" ]; then
  gh issue view "$ISSUE_NUMBER" --json title,body,comments > "${RUNNER_TEMP:-/tmp}/issue.json"
else
  gh pr view "$PR_NUMBER" --json title,body > "${RUNNER_TEMP:-/tmp}/issue.json"
  # Comments on a PR arrive one at a time (the triggering comment) via COMMENT_BODY.
fi

python3 - "$TEMPLATE" "$OUT" <<'PY'
import json, os, sys
template_path, out_path = sys.argv[1], sys.argv[2]
tmp = os.environ.get("RUNNER_TEMP", "/tmp")
data = json.load(open(f"{tmp}/issue.json"))
owner = os.environ["OWNER"]
bot = os.environ["BOT_NAME"]
allowed = {owner, bot}

comments = []
for c in data.get("comments", []) or []:
    login = (c.get("author") or {}).get("login", "")
    if login in allowed:
        comments.append(f"**{login}** ({c.get('createdAt','')}):\n{c.get('body','').strip()}")
comments_text = "\n\n---\n\n".join(comments) if comments else "(none)"

attr = os.environ.get("ATTR_LABELS", "").strip()
label_args = " ".join(f"--label {l.strip()}" for l in attr.split(",") if l.strip())

subs = {
    "ISSUE_NUMBER": os.environ.get("ISSUE_NUMBER", ""),
    "PR_NUMBER": os.environ.get("PR_NUMBER", ""),
    "ISSUE_TITLE": data.get("title", ""),
    "ISSUE_BODY": (data.get("body") or "").strip() or "(empty)",
    "ISSUE_COMMENTS": comments_text,
    "COMMENT_BODY": os.environ.get("COMMENT_BODY", "").strip(),
    "CLAUDE_BRANCH": os.environ["CLAUDE_BRANCH"],
    "REPO": os.environ["GH_REPO"],
    "MODEL": os.environ.get("MODEL", ""),
    "EFFORT": os.environ.get("EFFORT", ""),
    "ADVISOR": os.environ.get("ADVISOR", ""),
    "RISK_HIGH": os.environ.get("RISK_HIGH", "false"),
    "PR_LABEL_ARGS": label_args,
    "RUN_URL": os.environ.get("RUN_URL", ""),
}
text = open(template_path, encoding="utf-8").read()
for k, v in subs.items():
    text = text.replace("{{" + k + "}}", str(v))
open(out_path, "w", encoding="utf-8").write(text)
print(f"prompt written: {out_path} ({len(text)} chars, {len(comments)} comment(s) included)")
PY

# Expose the whole prompt as a step output (random delimiter: the body is
# untrusted text and must not be able to close the heredoc).
DELIM="PROMPT_$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
{
  echo "path=$OUT"
  echo "text<<${DELIM}"
  cat "$OUT"
  echo
  echo "${DELIM}"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"
