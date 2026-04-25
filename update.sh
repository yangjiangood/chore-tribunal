#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

main() {
  require_command git
  require_command docker
  docker compose version >/dev/null

  cd "$ROOT_DIR"

  if [[ ! -f ".env.prod" ]]; then
    echo "Missing .env.prod. Run: bash deploy.sh"
    exit 1
  fi

  git pull --ff-only
  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

  echo
  echo "Update finished."
  echo "Check status: docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
}

main "$@"
