#!/usr/bin/env bash
# One-command setup for a fresh VCL GPU machine.
# Usage (from the repo folder): bash scripts/vcl_setup.sh [model ...]
# Default model: gpt-oss:20b
set -e
MODELS=("$@"); [ ${#MODELS[@]} -eq 0 ] && MODELS=("gpt-oss:20b")

# Git identity, so commits made on the VCL are attributed correctly
git config user.name "Rehan Mohammed"
git config user.email "rehanmoin91@gmail.com"
git config credential.helper store

# Node 22 via nvm (no admin rights needed)
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -so- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
nvm install 22 >/dev/null && nvm use 22 >/dev/null

# Ollama in the home folder (no admin rights needed)
if [ ! -x "$HOME/ollama/bin/ollama" ]; then
  curl -sL https://github.com/ollama/ollama/releases/download/v0.34.3/ollama-linux-amd64.tar.zst -o /tmp/ollama.tar.zst
  mkdir -p "$HOME/ollama" && tar --zstd -xf /tmp/ollama.tar.zst -C "$HOME/ollama"
fi
if ! pgrep -f "ollama serve" >/dev/null; then
  nohup "$HOME/ollama/bin/ollama" serve > "$HOME/ollama.log" 2>&1 &
  sleep 5
fi
for m in "${MODELS[@]}"; do "$HOME/ollama/bin/ollama" pull "$m"; done

# Settings file pointing the code at local Ollama
if [ ! -f .env.local ]; then
  printf "OPENAI_BASE_URL=http://localhost:11434/v1\nOPENAI_API_KEY=ollama\nMODEL_NAME=%s\n" "${MODELS[0]}" > .env.local
fi

npm install --no-audit --no-fund
echo "Setup done. GPU check:"; nvidia-smi --query-gpu=name,memory.total --format=csv
