#!/usr/bin/env bash
# Saves results to GitHub every 30 minutes so nothing is lost when the
# VCL reservation ends. Run in the background:
#   nohup bash scripts/autopush.sh > ~/autopush.log 2>&1 &
while true; do
  sleep 1800
  git add results 2>/dev/null
  if ! git diff --cached --quiet; then
    git commit -q -m "Save results $(date '+%Y-%m-%d %H:%M')"
    git pull -q --rebase && git push -q && echo "$(date) pushed"
  fi
done
