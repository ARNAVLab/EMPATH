#!/usr/bin/env bash
# Runs one machine's share of the studies and saves to GitHub every 10 minutes.
# Used when the work is split across several smaller machines; each share
# covers different conditions, so machines never repeat each other's debates.
#   bash scripts/run_share.sh NAME
#   a   finish Study 1, then Study 2 on the neutral topic
#   b   Study 2 on the charged topic (UBI)
#   c   Study 3 (personality plus emotion)
#   l   everything left, on one large GPU: Study 2 both topics, Study 3,
#       the label-format check, and the Study 0 rerun
# Each study loops with a growing number of debates per condition (6, 8, 10,
# 12), so whatever time the machine has is used and nothing is repeated.
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
NAME=${1:?share name}
LOGS=results/logs
mkdir -p "$LOGS"
LOG="$LOGS/share_$NAME.log"
KEEP='^(===|Saved|Config|run |skip |\[[0-9]+/|Study|Batch|Match|  (label|vad|description|none))|rror|ERR|fail'
set -a; . results/calibration/choice.env; set +a
echo "$(date '+%m-%d %H:%M') share $NAME start: RULES=$RULES UO=$UO PROBE=$PROBE FORMAT=$FORMAT" >> "$LOG"

save() {
  (
    flock 9
    grep -cE "truncated = [1-9]|truncating input" ~/ollama.log > "$LOGS/truncations_$NAME.txt" 2>/dev/null
    git add results 2>/dev/null
    git diff --cached --quiet || git commit -q -m "Save results $(date '+%Y-%m-%d %H:%M')"
    for try in 1 2 3 4 5; do
      git pull -q --rebase --autostash && git push -q && break
      sleep $((RANDOM % 20 + 5))
    done
  ) 9> ~/.empath_save.lock
}
( while true; do sleep 600; save; done ) &

run() { "$@" 2>&1 | grep --line-buffered -E "$KEEP" >> "$LOG"; }

case "$NAME" in
  a)
    run npm run rep -- --reps 8 --topics debatable --file study1_debatable.jsonl --outdir results/study1 & P1=$!
    run npm run rep -- --reps 8 --topics controversial --file study1_controversial.jsonl --outdir results/study1 & P2=$!
    wait $P1 $P2
    save
    for n in 6 8 10 12; do run env N=$n TOPICS=universal bash scripts/study2.sh; save; done
    ;;
  b)
    for n in 6 8 10 12; do run env N=$n TOPICS=debatable bash scripts/study2.sh; save; done
    ;;
  c)
    for n in 6 8 10 12; do run env N=$n bash scripts/study3.sh; save; done
    ;;
  l)
    # One large GPU: four streams side by side, each with its own log.
    runl() { local name="$1"; shift; "$@" 2>&1 | grep --line-buffered -E "$KEEP" >> "$LOGS/share_l_$name.log"; }
    ( for n in 8 12; do runl ubi env N=$n TOPICS=debatable bash scripts/study2.sh; done ) & L1=$!
    ( for n in 8 12; do runl food env N=$n TOPICS=universal bash scripts/study2.sh; done ) & L2=$!
    ( for n in 8 12; do runl study3 env N=$n bash scripts/study3.sh; done ) & L3=$!
    (
      # Same angry conditions with the plain label format (no action wording
      # in the prompt), then the Study 0 baseline again at the 32k context.
      runl labelcheck env N=8 FORMAT=label TOPICS=debatable CELLS="on:angry frozen:angry" bash scripts/study2.sh
      runl study0 npm run batch -- --topics all --groups 8 --outdir results/study0_32k
    ) & L4=$!
    wait $L1 $L2 $L3 $L4
    ;;
esac
echo "$(date '+%m-%d %H:%M') share $NAME done" >> "$LOG"
save
