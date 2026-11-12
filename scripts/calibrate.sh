#!/usr/bin/env bash
# Calibration: which prompt setup gives a usable no-emotion baseline?
# Runs emotion-only debates with emotion OFF on the UBI topic under four
# setups, side by side. scripts/choose.py then picks one using these
# baseline debates only (no emotion condition is looked at).
#   strict + opinion update | soft + opinion update | soft | original prompt + opinion update
#   then with the agent's own private answer as its opinion: brief | soft
# Settings: CAL_N=3 debates per setup. Safe to rerun.
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
N=${CAL_N:-3}
OUT=results/calibration
mkdir -p "$OUT"

run_var() {  # $1 label  $2.. extra flags
  local label="$1"; shift
  local have
  have=$(ls "$OUT" 2>/dev/null | grep -c "_${label}_debatable_g")
  local need=$((N - have))
  if [ "$need" -le 0 ]; then echo "skip $label (have $have)"; return; fi
  echo "run $label: $need more"
  npm run batch -- --emotion-only --emotion off --topics debatable --groups "$need" \
    --outdir "$OUT" --label "$label" "$@"
}

run_var cal-strict-uo --rules strict --update-opinion &
run_var cal-soft-uo --rules soft --update-opinion &
run_var cal-soft --rules soft &
run_var cal-none-uo --rules none --update-opinion &
wait
# Second set: the agent's own private answer drives its opinion. The first
# version of the private check kept the stance sentence in the prompt and the
# answers never moved (cal-*-self, one debate each, kept in results). The
# "open" check tells the agent its earlier position and lets it move.
run_var cal-brief-open --rules brief --update-opinion self --probe-style open &
run_var cal-soft-open --rules soft --update-opinion self --probe-style open &
wait
DONE=$(ls "$OUT" | grep -cE "_cal-(strict-uo|soft-uo|soft|none-uo|brief-open|soft-open)_debatable_g")
echo "Calibration pass finished ($DONE of $((6 * N)) debates)."
[ "$DONE" -ge $((6 * N)) ]
