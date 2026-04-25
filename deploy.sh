#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env.prod"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
PROVIDER="${1:-${LLM_PROVIDER:-aliyun}}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

resolve_provider() {
  case "$1" in
    aliyun|deepseek|kimi|zhipu|custom)
      printf '%s' "$1"
      ;;
    *)
      echo "Unsupported LLM_PROVIDER: $1"
      echo "Allowed values: aliyun | deepseek | kimi | zhipu | custom"
      exit 1
      ;;
  esac
}

read_app_port() {
  if [[ -f "$ENV_FILE" ]]; then
    local value
    value="$(grep '^APP_PORT=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return
    fi
  fi

  printf '%s' "${APP_PORT:-80}"
}

write_env_file() {
  local provider="$1"
  local postgres_db="${POSTGRES_DB:-tribunal}"
  local postgres_user="${POSTGRES_USER:-tribunal}"
  local postgres_password="${POSTGRES_PASSWORD:-$(random_hex 16)}"
  local jwt_secret="${JWT_SECRET:-$(random_hex 32)}"
  local app_port="${APP_PORT:-80}"
  local npm_registry="${NPM_REGISTRY:-https://registry.npmmirror.com}"
  local jwt_exp="${JWT_ACCESS_EXPIRES_IN_SECONDS:-3600}"
  local refresh_days="${REFRESH_TOKEN_TTL_DAYS:-30}"
  local llm_base_url="${LLM_BASE_URL:-}"
  local llm_api_key="${LLM_API_KEY:-}"
  local llm_model="${LLM_MODEL:-}"
  local vite_api_base_url="${VITE_API_BASE_URL:-}"
  local dashscope_api_key="${DASHSCOPE_API_KEY:-}"
  local deepseek_api_key="${DEEPSEEK_API_KEY:-}"
  local moonshot_api_key="${MOONSHOT_API_KEY:-}"
  local zai_api_key="${ZAI_API_KEY:-}"
  local llm_timeout_ms="${LLM_TIMEOUT_MS:-12000}"
  local llm_max_retries="${LLM_MAX_RETRIES:-2}"

  cat >"$ENV_FILE" <<EOF
APP_PORT=${app_port}
NPM_REGISTRY=${npm_registry}

POSTGRES_DB=${postgres_db}
POSTGRES_USER=${postgres_user}
POSTGRES_PASSWORD=${postgres_password}

JWT_SECRET=${jwt_secret}
JWT_ACCESS_EXPIRES_IN_SECONDS=${jwt_exp}
REFRESH_TOKEN_TTL_DAYS=${refresh_days}

LLM_PROVIDER=${provider}
LLM_BASE_URL=${llm_base_url}
LLM_API_KEY=${llm_api_key}
LLM_MODEL=${llm_model}
VITE_API_BASE_URL=${vite_api_base_url}

DASHSCOPE_API_KEY=${dashscope_api_key}
DEEPSEEK_API_KEY=${deepseek_api_key}
MOONSHOT_API_KEY=${moonshot_api_key}
ZAI_API_KEY=${zai_api_key}

LLM_TIMEOUT_MS=${llm_timeout_ms}
LLM_MAX_RETRIES=${llm_max_retries}
EOF
}

print_summary() {
  local app_port
  app_port="$(read_app_port)"

  echo
  echo "Deployment finished."
  echo "Open: http://SERVER_IP:${app_port}"
  echo
  echo "Useful commands:"
  echo "docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
  echo "docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend"
}

main() {
  require_command docker
  docker compose version >/dev/null

  local provider
  provider="$(resolve_provider "$PROVIDER")"

  cd "$ROOT_DIR"

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Missing file: ${COMPOSE_FILE}"
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Creating .env.prod"
    write_env_file "$provider"
  else
    echo "Using existing .env.prod"
  fi

  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
  print_summary
}

main "$@"
