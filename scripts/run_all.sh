#!/usr/bin/env bash
# Runs every EMPATH study on a set-up VCL GPU machine, in the background,
# and saves results to GitHub as it goes. Started by scripts/go.sh.
#
#   Stage A (side by side): calibration debates + Study 1 (emotion format)
#   Choose the debate setup and emotion format (scripts/choose.py)
#   Stage B (side by side): Study 2 (two topic streams) + Study 3
#
# Everything is resumable: run it again on a new machine and it only does
# what is still missing. Sizes: N (8), CAL_N (3), REPS (8).
# Slow machine: SKIP_STUDY1=1 and/or STAGE_A_ONLY=1 to run only part of stage A.
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
LOGS=results/logs
mkdir -p "$LOGS"
KEEP='^(===|Saved|Config|run |skip |\[[0-9]+/|Study|Batch|Calibration|Match|  (label|vad|description|none))|rror|ERR|fail'

save() {
  [ -n "$SKIP_GIT" ] && return
  (
    flock 9
    cp ~/run_all.log "$LOGS/run_all.log" 2>/dev/null
    grep -cE "truncated = [1-9]|truncating input" ~/ollama.log > "$LOGS/ollama_truncations.txt" 2>/dev/null
    git add results 2>/dev/null
    if ! git diff --cached --quiet; then
      git commit -q -m "Save results $(date '+%Y-%m-%d %H:%M')"
      git pull -q --rebase --autostash && git push -q && echo "$(date '+%H:%M') pushed"
    fi
  ) 9> ~/.empath_save.lock
}

stream() {  # $1 log name  $2.. command; up to 3 passes until it succeeds
  local name="$1"; shift
  for pass in 1 2 3; do
    "$@" 2>&1 | grep --line-buffered -E "$KEEP" >> "$LOGS/$name.log"
    [ "${PIPESTATUS[0]}" -eq 0 ] && return 0
    echo "$name: pass $pass had failures, retrying"
  done
  echo "$name: still incomplete after 3 passes"
}

( while true; do sleep 1200; save; done ) &
SAVER=$!

echo "$(date '+%H:%M') stage A: calibration + study 1"
stream calibration bash scripts/calibrate.sh & A1=$!
A2=""; A3=""
if [ -z "$SKIP_STUDY1" ]; then
  stream study1_debatable npm run rep -- --reps "${REPS:-8}" --topics debatable --file study1_debatable.jsonl --outdir results/study1 & A2=$!
  stream study1_controversial npm run rep -- --reps "${REPS:-8}" --topics controversial --file study1_controversial.jsonl --outdir results/study1 & A3=$!
fi
wait $A1 $A2 $A3
if [ -n "$STAGE_A_ONLY" ]; then
  pkill -P $SAVER 2>/dev/null; kill $SAVER 2>/dev/null
  save
  echo "$(date '+%H:%M') stage A done (STAGE_A_ONLY)"
  exit 0
fi

echo "$(date '+%H:%M') choosing setup and format"
if [ ! -f results/calibration/choice.env ]; then python3 scripts/choose.py; fi
set -a; . results/calibration/choice.env; set +a
echo "chosen: RULES=$RULES UO=$UO FORMAT=$FORMAT"
save

echo "$(date '+%H:%M') stage B: study 2 + study 3"
( export TOPICS=debatable; stream study2_debatable bash scripts/study2.sh ) & B1=$!
( export TOPICS=universal; stream study2_universal bash scripts/study2.sh ) & B2=$!
stream study3 bash scripts/study3.sh & B3=$!
wait $B1 $B2 $B3

python3 scripts/analyze.py results/calibration results/study2 results/study3 > results/summary.md 2>&1
pkill -P $SAVER 2>/dev/null; kill $SAVER 2>/dev/null
save
echo "$(date '+%H:%M') ALL DONE"
save
