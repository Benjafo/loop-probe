---
name: dispatch
description: Queue issues for implementing runs by applying labels. Reads the Ready column (plus answered In Progress cards), fills missing attribute labels from flags, adds `claude` last, moves the card to In Progress. Skips and reports anything already running, waiting for input, an epic, blocked, or with an open PR. Runs for seconds and exits.
---

# /dispatch

Apply labels; change nothing else. The `claude` label is the only trigger and is added last, as its own command, because the build workflow fires on that label and reads every label on the issue at that instant. A hand-applied label and this skill are the same entry point; the Action doesn't know which applied it.

## Usage

```
/dispatch [issues] [--model sonnet|opus|fable] [--effort low|medium|high|xhigh|max] [--advisor opus|fable|off] [--risk high] [--limit N]
```

- `issues`: space-separated numbers (`12 13 14`), a range (`12-15`), or both. Omitted means the queue, in order.
- Flags **fill gaps, never overwrite**: `--model sonnet` on an issue already labeled `model:opus` leaves opus in place. Report when a flag was ignored for that reason.
- `--limit N` caps how many issues get `claude` this invocation. Default 1. Size it to what the owner will review, never to the usage limit; until the test suite has substance, 1.
- `--risk high` adds `risk:high` where absent.

Parse the arguments before any tool call. Reject unknown flags or values with the usage line above.

## Step 1: preconditions

Run all three, then stop and say what to fix if any fails:

```bash
gh --version                       # need 2.94.0 or later: `blockedBy` on `gh issue view --json`
cat .claude/project.json           # written by setup.sh; refuse without it
gh auth status                     # must succeed
```

Read from `project.json`: `repo`, `project_number`, `project_id`, `status_field_id`, `status_options.{backlog,ready,in_progress,in_review,done,discarded}` (older files lack `in_review` and `discarded`; the skill never sets either, so their absence is not an error). Resolve the app's bot login once: `gh variable get LOOP_APP_SLUG` → `BOT="<slug>[bot]"`. If the variable is missing, say so and continue; the open-PR check then uses `--author` with the head-branch pattern alone.

Note the current `gh` identity (`gh api user --jq .login`); if it is not the repo owner, warn that the labeled event's actor must be the owner for the build workflow's gate to pass, and continue.

## Step 2: build the candidate list

If issue numbers were given, that is the list, in the order given.

Otherwise, the queue, from the project board:

```bash
gh project item-list "$PROJECT_NUMBER" --owner @me --limit 200 --format json \
  --jq '[.items[] | select(.content.type=="Issue" and .content.repository==$repo)
         | {item: .id, number: .content.number, status: .status}]' --arg repo "$REPO"
```

Items in **In review** (set by the project's "PR linked" workflow) are never candidates: a PR exists for them. Nothing moves a card back out of In review, so after a close-and-reissue the owner drags the card to Ready; if a named issue sits in In review with no open PR, dispatch it anyway and say so. Items in **Done** or **Discarded** are never candidates either, named or not: both mean a closed issue, and Discarded is the owner's record that it was closed without a merge. Skip and report one that is named.

Queue order: every item with `status == "Ready"` in board order, then every item with `status == "In Progress"` (those are filtered in step 3: an In Progress card qualifies only when its issue carries neither `claude` nor `needs-input`, meaning the owner answered or rewrote it after a run and nothing could move its card back, since the app token can't touch a user project).

Keep each candidate's project item id; step 4 needs it to move the card. For explicitly named issues, look the item id up from the same listing; an issue with no card is still dispatched, and the report says the card could not be moved.

## Step 3: for each candidate, in order, until `--limit` is reached

Fetch once per issue:

```bash
gh issue view N --json number,title,state,labels,blockedBy,url \
  --jq '{number,title,state,labels:[.labels[].name],url,blockedBy:[.blockedBy[]? | {number,state}]}'
```

Skip and record the reason when **any** of these holds (check in this order, report the first):

1. `state != OPEN` → "closed".
2. `claude` in labels → "already labeled claude: a run is queued or in progress".
3. `needs-input` in labels → "needs-input: a run asked a question or left a draft; answer, then remove the label".
4. `epic` in labels → "epic: a /plan parent holds sub-issues, not work" (even if the card is in Ready).
5. For an In Progress card (queue mode only): if neither 2 nor 3 fired, it qualifies; otherwise it was already skipped above.
6. Any `blockedBy` entry with `state == OPEN` → "blocked by #M (open)". Dependent issues need a merge between them; this enforces it.
7. An open PR authored by the app for this issue:
   ```bash
   gh pr list --state open --author "$BOT" --json number,headRefName \
     --jq '[.[] | select(.headRefName | test("^claude/issue-N-"))] | .[0].number // empty'
   ```
   → "open PR #P: re-dispatching would close it as superseded". Whatever column the card is in.

Otherwise dispatch it:

1. Compute the attribute labels to add: for each of `--model`, `--effort`, `--advisor`, `--risk`, if the issue has **no** label in that family (`model:*`, `effort:*`, `advisor:*`, `risk:high`), add the flag's label; if it already has one, leave it and note "kept <existing>".
2. One call for the attributes, if any: `gh issue edit N --add-label "model:opus,risk:high"`.
3. Then, as its own command: `gh issue edit N --add-label claude`.
4. Move the card: `gh project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$STATUS_FIELD_ID" --single-select-option-id "$IN_PROGRESS"`. If this fails (a cloud session's `gh` may lack project permission, or the issue has no card), the labels still went on: record "dispatched; card did not move: <error one-liner>". Never retry the labels.
5. Count it toward `--limit`.

Stop iterating when the limit is reached; the remaining candidates are reported as "not dispatched: limit N reached".

Never: remove a label, touch `needs-input`, edit an issue body, comment, create anything, or label an epic.

## Step 4: report and exit

One line per candidate, in order:

```
#12 dispatched  labels now: model:opus, risk:high, claude  card → In Progress
#13 dispatched  labels now: claude  (kept model:sonnet; --model opus ignored)  card did not move: project permission
#14 skipped     blocked by #12 (open)
#15 skipped     epic
#16 not dispatched: limit 2 reached
```

Then one summary line: how many dispatched, and a reminder that the runs share one build queue and the owner's usage window. Exit; this skill does not watch runs.
