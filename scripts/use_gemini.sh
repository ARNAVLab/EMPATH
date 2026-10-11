#!/usr/bin/env bash
# Point the simulation at Gemini. Asks for your API key (hidden as you type),
# picks the closest available model to the paper's Gemini 1.5 Flash, and
# writes .env.local. The key stays on this machine (.env.local is gitignored).
# Usage: bash scripts/use_gemini.sh
set -e
read -r -s -p "Paste your Gemini API key and press Enter: " KEY; echo
MODELS=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=1000" | grep -o '"name": *"models/[^"]*"' | sed 's/.*models\///; s/"//g')
if [ -z "$MODELS" ]; then echo "Could not list models. Check the key and try again."; exit 1; fi
echo "Flash models your key can use:"; echo "$MODELS" | grep -i flash | sed 's/^/  /'
PICK=""
for m in gemini-1.5-flash gemini-2.0-flash gemini-2.5-flash; do
  if echo "$MODELS" | grep -qx "$m"; then PICK=$m; break; fi
done
[ -z "$PICK" ] && PICK=$(echo "$MODELS" | grep -i flash | head -1)
[ -f .env.local ] && cp .env.local .env.local.backup
printf "OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/\nOPENAI_API_KEY=%s\nMODEL_NAME=%s\n" "$KEY" "$PICK" > .env.local
echo "Using $PICK. Settings saved to .env.local (old settings in .env.local.backup)."
