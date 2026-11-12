#!/usr/bin/env bash
# Study 3: personality plus emotion. Same MBTI groups in every condition
# (saved in results/study3/groups.json), UBI topic.
#   off            original personalities, no emotion
#   on, calm       emotion layer on, everyone starts calm
#   on, angry      emotion layer on, everyone starts angry
# Safe to stop and rerun: each condition only runs the debates it is missing.
# Settings: N=8, RULES=strict|soft|brief|none, UO=1, FORMAT=label|vad|description
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
N=${N:-8}; RULES=${RULES:-strict}; FORMAT=${FORMAT:-label}
case "$RULES" in strict) SUF="-dr";; soft) SUF="-ds";; brief) SUF="-db";; *) SUF="";; esac
case "$UO" in "") UOFLAG="";; self) SUF="$SUF-us"; UOFLAG="--update-opinion self";; *) SUF="$SUF-uo"; UOFLAG="--update-opinion";; esac
OUT=results/study3
mkdir -p "$OUT"
FAIL=0

run_cell() {  # $1 emotion  $2 start
  local label="pe-$1-$FORMAT-$2$SUF"
  local have
  have=$(ls "$OUT" 2>/dev/null | grep -c "_${label}_debatable_g")
  if [ "$have" -ge "$N" ]; then echo "skip $label (have $have)"; return; fi
  echo "run $label: groups $have..$((N - 1))"
  npm run batch -- --emotion "$1" --start "$2" --format "$FORMAT" --rules "$RULES" $UOFLAG --probe \
    --topics debatable --groups "$N" --skip "$have" --groups-file "$OUT/groups.json" \
    --outdir "$OUT" --label "$label" || FAIL=1
}

run_cell off calm
run_cell on calm
run_cell on angry
echo "Study 3 pass finished (fail=$FAIL)."
exit $FAIL
