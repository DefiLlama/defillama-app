#!/usr/bin/env bash

set -u
set -o pipefail

read_secret_into_env() {
  local name="$1"
  local path="/run/secrets/${name}"
  if [ -s "$path" ]; then
    export "$name"
    printf -v "$name" "%s" "$(cat "$path")"
  fi
}

read_secret_into_env LOGGER_API_KEY
read_secret_into_env LOGGER_API_URL
read_secret_into_env BUILD_STATUS_DASHBOARD
read_secret_into_env BUILD_STATUS_WEBHOOK

export COOLIFY_BRANCH="${COOLIFY_BRANCH:-}"

START_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_TIME_TS="$(date -u +%s)"

set +e
bun run build 2>&1 | tee build.log
BUILD_STATUS="${PIPESTATUS[0]}"
set -e

BUILD_TIME_SEC="$(( $(date -u +%s) - START_TIME_TS ))"
BUILD_TIME_MIN="$(( BUILD_TIME_SEC / 60 ))"
BUILD_TIME_STR="$(printf "%ss" $(( BUILD_TIME_SEC % 60 )))"
if [ "$BUILD_TIME_MIN" -gt 0 ]; then
  BUILD_TIME_STR="$(printf "%sm %s" "$BUILD_TIME_MIN" "$BUILD_TIME_STR")"
fi

BUILD_MANIFEST="$(find .next -name _buildManifest.js -print -quit 2>/dev/null || true)"
BUILD_ID=""
if [ -n "$BUILD_MANIFEST" ]; then
  BUILD_ID="$(basename "$(dirname "$BUILD_MANIFEST")")"
fi

BRANCH_NAME="${BRANCH_NAME:-${COOLIFY_BRANCH:-}}"

export BUILD_STATUS BUILD_TIME_STR START_TIME BUILD_ID BRANCH_NAME

set +e
bun run ./scripts/build-msg.js
set -e

exit "$BUILD_STATUS"

