#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
SLACK_WEBHOOK_SECRET="${SLACK_WEBHOOK_SECRET:-xtask-bots-webhook-slack-signing-secret}"
TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-xtask-bots-webhook-telegram-signing-secret}"

SLACK_BODY='{"text":"deploy production","channel_id":"ops-room","user_id":"u-1"}'
TELEGRAM_BODY='{"message":{"text":"/start","chat":{"id":999},"from":{"id":123}}}'

now_ts() {
  date +%s
}

hmac_sha256_hex() {
  local secret="$1"
  local input="$2"
  printf "%s" "$input" | openssl dgst -sha256 -hmac "$secret" -hex | sed -E 's/^.* ([a-f0-9]+)$/\1/'
}

send_slack_webhook() {
  local timestamp
  timestamp="$(now_ts)"

  local slack_base
  slack_base="v0:${timestamp}:${SLACK_BODY}"

  local digest
  digest="$(hmac_sha256_hex "$SLACK_WEBHOOK_SECRET" "$slack_base")"
  local signature="v0=${digest}"

  echo "Sending Slack webhook to ${BASE_URL}/webhooks/slack"
  curl -sS -X POST "${BASE_URL}/webhooks/slack" \
    -H "Content-Type: application/json" \
    -H "x-slack-request-timestamp: ${timestamp}" \
    -H "x-slack-signature: ${signature}" \
    --data "${SLACK_BODY}"
  echo
}

send_telegram_webhook() {
  local digest
  digest="$(hmac_sha256_hex "$TELEGRAM_WEBHOOK_SECRET" "$TELEGRAM_BODY")"

  echo "Sending Telegram webhook to ${BASE_URL}/webhooks/telegram"
  curl -sS -X POST "${BASE_URL}/webhooks/telegram" \
    -H "Content-Type: application/json" \
    -H "x-telegram-signature: ${digest}" \
    --data "${TELEGRAM_BODY}"
  echo
}

main() {
  send_slack_webhook
  send_telegram_webhook
}

main
