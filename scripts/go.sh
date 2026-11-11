#!/usr/bin/env bash
# One command for a fresh VCL GPU machine (run from the repo folder):
#   bash scripts/go.sh
# Sets the machine up, checks the GitHub login once, then runs every study in
# the background and saves results to GitHub as they finish.
cd "$(dirname "$0")/.."
bash scripts/vcl_setup.sh || { echo "setup failed"; exit 1; }
echo
echo "GitHub login check. Enter your GitHub username, then your token as the password."
git push origin HEAD:main || { echo "push failed: fix the login and run this again"; exit 1; }
if pgrep -f "scripts/run_all.sh" >/dev/null; then echo "already running"; exit 0; fi
nohup bash scripts/run_all.sh > ~/run_all.log 2>&1 &
echo
echo "Started. You can close this window; it keeps running on the VCL."
echo "Progress: tail -f ~/run_all.log"
