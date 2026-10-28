#!/usr/bin/env bash
# Study 2: emotion only (no personality), the 3D matrix from the 9/18 meeting.
#   emotion setting: off | on | frozen
#   topic:           universal (neutral) | debatable (charged, UBI)
#   starting mood:   excited (happy) | angry
# "off" has no mood, so it runs once per topic.
#
# Safe to stop and rerun: each cell only runs the debates it is still missing.
#   bash scripts/study2.sh            (8 debates per cell, 10 cells = 80)
#   N=4 bash scripts/study2.sh        (fewer per cell)
#   UO=1 bash scripts/study2.sh       (opinion updates each turn, paper Alg 1)
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
N=${N:-8}
OUT=results/study2
mkdir -p "$OUT"

run_cell() {  # $1 emotion  $2 start  $3 topic
  local label="eo-$1-label-$2-dr${UO:+-uo}"
  local have
  have=$(ls "$OUT" 2>/dev/null | grep -c "_${label}_${3}_g")
  local need=$((N - have))
  if [ "$need" -le 0 ]; then echo "skip $label $3 (have $have)"; return; fi
  echo "run $label $3: $need more"
  npm run batch -- --emotion-only --emotion "$1" --start "$2" --debate-rules ${UO:+--update-opinion} \
    --topics "$3" --groups "$need" --outdir "$OUT" --label "$label"
}

for topic in debatable universal; do
  run_cell off calm "$topic"
  for start in angry excited; do
    run_cell on "$start" "$topic"
    run_cell frozen "$start" "$topic"
  done
done
echo "Study 2 done."
