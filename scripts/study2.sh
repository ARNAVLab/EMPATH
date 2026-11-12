#!/usr/bin/env bash
# Study 2: emotion only (no personality), the 3D matrix from the 9/18 meeting.
#   emotion setting: off | on | frozen
#   topic:           universal (neutral) | debatable (charged, UBI)
#   starting mood:   excited (happy) | angry
# "off" has no mood, so it runs once per topic.
#
# Safe to stop and rerun: each cell only runs the debates it is still missing.
# Settings (environment variables):
#   N=8            debates per cell (10 cells)
#   RULES=strict   strict | soft | brief | none   (debate rules variant)
#   UO=1           opinion updates each turn from the judge (paper Algorithm 1)
#   UO=self        opinion updates from the agent's own private answer; empty = off
#   FORMAT=label   label | vad | description
#   TOPICS="debatable universal"
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
N=${N:-8}; RULES=${RULES:-strict}; FORMAT=${FORMAT:-label}; TOPICS=${TOPICS:-"debatable universal"}
case "$RULES" in strict) SUF="-dr";; soft) SUF="-ds";; brief) SUF="-db";; *) SUF="";; esac
case "$UO" in "") UOFLAG="";; self) SUF="$SUF-us"; UOFLAG="--update-opinion self";; *) SUF="$SUF-uo"; UOFLAG="--update-opinion";; esac
OUT=results/study2
mkdir -p "$OUT"
FAIL=0

run_cell() {  # $1 emotion  $2 start  $3 topic
  local label="eo-$1-$FORMAT-$2$SUF"
  local have
  have=$(ls "$OUT" 2>/dev/null | grep -c "_${label}_${3}_g")
  local need=$((N - have))
  if [ "$need" -le 0 ]; then echo "skip $label $3 (have $have)"; return; fi
  echo "run $label $3: $need more"
  npm run batch -- --emotion-only --emotion "$1" --start "$2" --format "$FORMAT" --rules "$RULES" \
    $UOFLAG --probe --topics "$3" --groups "$need" --outdir "$OUT" --label "$label" || FAIL=1
}

for topic in $TOPICS; do
  run_cell off calm "$topic"
  for start in angry excited; do
    run_cell on "$start" "$topic"
    run_cell frozen "$start" "$topic"
  done
done
echo "Study 2 pass finished (fail=$FAIL)."
exit $FAIL
