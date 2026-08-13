#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEV_TEST_PORT="${DEV_TEST_PORT:-8082}"
CODE_SERVER_ORIGIN="${CODE_SERVER_ORIGIN:-https://code.ktwome.cc}"

cd "$PROJECT_DIR"

if [[ ! "$DEV_TEST_PORT" =~ ^[0-9]+$ ]] || (( DEV_TEST_PORT < 1 || DEV_TEST_PORT > 65535 )); then
  echo "DEV_TEST_PORT must be a number between 1 and 65535." >&2
  exit 1
fi

node_is_supported() {
  command -v node >/dev/null 2>&1 \
    && command -v npm >/dev/null 2>&1 \
    && node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 20 || (major === 20 && minor >= 19) ? 0 : 1)'
}

if ! node_is_supported; then
  NVM_SCRIPT="${NVM_DIR:-${HOME}/.nvm}/nvm.sh"

  if [[ -s "$NVM_SCRIPT" ]]; then
    set +u
    # shellcheck disable=SC1090
    source "$NVM_SCRIPT"
    set -u

    if nvm version 24.18.1 >/dev/null 2>&1; then
      nvm use 24.18.1 >/dev/null
    elif nvm version default >/dev/null 2>&1; then
      nvm use default >/dev/null
    fi
  fi
fi

if ! node_is_supported; then
  echo "Node.js 20.19 or newer and npm are required." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "[setup] Installing dependencies from package-lock.json..."
  npm ci
fi

echo "[check] Running TypeScript type checks..."
npm run typecheck

echo "[check] Running Vitest..."
npm test

PROXY_URL="${CODE_SERVER_ORIGIN%/}/absproxy/${DEV_TEST_PORT}/"

printf '\n[dev] Checks passed. Starting Vite on port %s...\n' "$DEV_TEST_PORT"
printf '[dev] Open: %s\n\n' "$PROXY_URL"

exec npm run dev -- \
  --host 127.0.0.1 \
  --port "$DEV_TEST_PORT" \
  --strictPort \
  --base "/absproxy/${DEV_TEST_PORT}/"
