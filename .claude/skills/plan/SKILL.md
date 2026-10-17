---
name: plan
description: Turn a plain-English feature description into an approved, ordered breakdown of issues in the project's Backlog, as sub-issues of an epic parent with blocked-by set. Runs on Opus (high). Creates nothing until the owner approves the breakdown.
---

# /plan

A planning conversation is the cheapest place to spend a strong model: one Opus session sets the criteria for many Sonnet runs. Ask the clarifying questions now, so the implementing run doesn't have to. Creating an issue spends nothing; promoting it to Ready is the owner's spend decision, so this skill never promotes and never adds `claude`.

## Step 1: preconditions

Check all three before reading anything; stop and say what to fix if one fails:

1. **Model is Opus.** Ask the harness which model is active; if it is not Opus, say "run `/model opus` first, then `/plan` again" and stop. (Frontmatter can't set the model for a conversation; the override lasts one turn.)
2. **`gh --version` ≥ 2.94.0** (`--parent` and `--blocked-by` on `gh issue create`).
3. **`.claude/project.json` exists** with `repo`, `project_number`, `project_id`, `status_field_id`, `status_options.backlog`. Refuse without it: `setup.sh` has not run.

## Step 2: read

- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, and `.claude/rules/*.md`.
- Open issues: `gh issue list --state open --limit 200 --json number,title,labels,body` — to avoid duplicating work already planned and to find an existing epic this feature belongs to.
- The feature description the owner gave with the command (or ask for it if the command was bare).

## Step 3: ask

Ask the clarifying questions one message at a time, as few as possible, only what a breakdown can't be written without: scope edges, which existing flows it touches, data model changes, auth implications, what "done" looks like to the owner, anything SPEC.md is silent on. Stop asking when you can write criteria you'd be willing to be tested against.

## Step 4: propose the breakdown

In the conversation, not on GitHub. Ordered, vertical slices (one PR each, through every layer the slice needs), independent where possible. For each issue:

- **Title** (imperative, under 70 chars)
- **Summary**, **Why**
- **Acceptance criteria**: numbered `AC-1`, `AC-2`, … in Given/When/Then. Each one will become a test named with that id, so each must be checkable by a test. Aim for 2–6 per issue; more means the issue is too big.
- **Out of scope**
- **How to verify in the preview**: click-by-click.
- **Area**: the directories it touches (the reviewer flags files outside it).
- **Depends on**: other issues in this breakdown, by their position number.
- **Suggested `risk:high`**: yes/no, with the reason (auth, payments, deletion, migrations, or an area CLAUDE.md names).
- **Size**: S/M/L. An L is a signal to split.

The owner edits or approves in the conversation. **Nothing is created before an explicit approval.** On "approve", proceed; on edits, re-propose the changed items.

## Step 5: create, in dependency order

1. **The epic parent.** One issue for the feature, labeled `epic`, body: the feature description, the ordered list of sub-issue titles (fill in numbers as they are created), and the line "Holds the sub-issues; not work. /dispatch skips it. Close by hand when the last sub-issue merges." Add it to the project in Backlog (step 5.3).
2. **Each sub-issue**, in an order where every blocker already exists. Write the body in the issue form's section shape, since `gh` cannot fill a YAML form — same headings, same resulting issue:

   ```
   ### Summary
   …
   ### Why
   …
   ### Acceptance criteria
   - AC-1: Given …, when …, then ….
   - AC-2: …
   ### Out of scope
   …
   ### How to verify in the preview
   1. …
   ### Dependencies
   Blocked by #M (set in the sidebar by this skill; /dispatch reads the relationship, not this text).
   ```

   ```bash
   gh issue create --title "…" --body-file body.md --parent "$EPIC" --blocked-by "12,13" --label risk:high
   ```
   `--blocked-by` only when there are blockers; `--label risk:high` only where suggested. Never `--label claude`. Capture the new number from the URL it prints.
3. **Add to the project and set Backlog**, for the epic and every sub-issue:
   ```bash
   ITEM="$(gh project item-add "$PROJECT_NUMBER" --owner @me --url "$ISSUE_URL" --format json --jq .id)"
   gh project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$STATUS_FIELD_ID" --single-select-option-id "$BACKLOG"
   ```
   If either call fails for lack of permission, the issue still exists: record "created #N; card not added: <reason>" in the same words `/dispatch` uses, and continue. (The project's auto-add toggle will usually pick it up anyway.)
4. Edit the epic's body to replace the title list with `#N` links once all numbers exist.

If creation fails partway, stop, report exactly which issues exist and which don't, and do not retry automatically: a second run would duplicate the ones that succeeded.

## Step 6: report

The epic number, then one line per sub-issue: number, title, blockers, labels, card status. Remind the owner that everything is in Backlog and nothing runs until they promote to Ready and either add `claude` or run `/dispatch`.
