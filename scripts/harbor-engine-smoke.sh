#!/usr/bin/env bash
set -euo pipefail

ENGINE_BASE_URL="${HARBOR_ENGINE_BASE_URL:-https://engine.harborworks.ai}"
CREDENTIALS_PATH="${HARBOR_HW_CREDENTIALS:-$HOME/.hw/credentials.json}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for the Harbor Engine smoke." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for the Harbor Engine smoke." >&2
  exit 1
fi

if [ -z "${HARBOR_ENGINE_TOKEN:-}" ]; then
  if [ ! -r "$CREDENTIALS_PATH" ]; then
    echo "Missing Harbor credentials at $CREDENTIALS_PATH." >&2
    echo "Run hw auth login, or set HARBOR_ENGINE_TOKEN explicitly." >&2
    exit 1
  fi

  HARBOR_ENGINE_TOKEN="$(jq -r '.token // empty' "$CREDENTIALS_PATH")"
fi

if [ -z "$HARBOR_ENGINE_TOKEN" ]; then
  echo "Harbor credentials did not contain a token." >&2
  exit 1
fi

response="$(curl -sS "${ENGINE_BASE_URL%/}/anthropic/v1/messages" \
  -H "Authorization: Bearer $HARBOR_ENGINE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.6",
    "max_tokens": 32,
    "messages": [
      {
        "role": "user",
        "content": "Whats 2 + 2?"
      }
    ]
  }')"

printf '%s\n' "$response" | jq
printf '%s\n' "$response" | jq -e '(.type == "message") and (has("error") | not)' >/dev/null
