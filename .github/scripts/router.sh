#!/usr/bin/env bash
# Router: turn the attribute labels on an issue or PR into Claude CLI flags.
#
# Reads LABELS (newline- or comma-separated label names) and writes to
# $GITHUB_OUTPUT:
#   claude_args   "--model X --effort Y [--advisor Z]"
#   model, effort, advisor, risk_high ("true"/"false")
#   attr_labels   comma-separated attribute labels found (model:*, effort:*,
#                 advisor:*, risk:high), for back-filling onto the PR
#
# Defaults when a label is absent: sonnet, high, opus advisor. When the model
# is fable the advisor defaults to off, since only Fable can advise Fable;
# advisor:fable is always an explicit label. To change the defaults, change
# the three lines below and nothing else.
set -euo pipefail

MODEL=sonnet
EFFORT=high
ADVISOR=""        # empty = apply the default below
RISK_HIGH=false
ATTRS=()

while IFS= read -r label; do
  label="${label//,/$'\n'}"
  while IFS= read -r l; do
    l="$(echo "$l" | xargs)"   # trim
    [ -z "$l" ] && continue
    case "$l" in
      model:sonnet|model:opus|model:fable)         MODEL="${l#model:}";   ATTRS+=("$l") ;;
      effort:low|effort:medium|effort:high|effort:xhigh|effort:max)
                                                   EFFORT="${l#effort:}"; ATTRS+=("$l") ;;
      advisor:opus|advisor:fable|advisor:off)      ADVISOR="${l#advisor:}"; ATTRS+=("$l") ;;
      risk:high)                                   RISK_HIGH=true;        ATTRS+=("$l") ;;
    esac
  done <<< "$label"
done <<< "${LABELS:-}"

if [ -z "$ADVISOR" ]; then
  if [ "$MODEL" = "fable" ]; then ADVISOR=off; else ADVISOR=opus; fi
fi

ARGS="--model $MODEL --effort $EFFORT"
if [ "$ADVISOR" != "off" ]; then
  ARGS="$ARGS --advisor $ADVISOR"
fi

echo "router: model=$MODEL effort=$EFFORT advisor=$ADVISOR risk_high=$RISK_HIGH"
{
  echo "claude_args=$ARGS"
  echo "model=$MODEL"
  echo "effort=$EFFORT"
  echo "advisor=$ADVISOR"
  echo "risk_high=$RISK_HIGH"
  echo "attr_labels=$(IFS=,; echo "${ATTRS[*]:-}")"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"
