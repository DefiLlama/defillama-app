#!/bin/bash
#
# Full build pipeline: metadata → Next.js build via Bun runtime → rclone artifact sync → discord notification.
# Called by the Dockerfile builder stage and can also be run locally.

set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || { echo "Failed to cd to $REPO_ROOT"; exit 1; }

# Source .env for local builds (Docker builds get env vars via ARGs/secrets)
set -a
[ -f .env ] && . .env
set +a

# Capture the full build flow, including metadata failures, before the
# notification step reads and uploads build.log.
LOG_PIPE="$(mktemp -u "${TMPDIR:-/tmp}/defillama-build-log.XXXXXX")"
TEE_PID=""
BUILD_LOG_REDIRECTED=0

cleanup_build_log_pipe() {
  if [ "$BUILD_LOG_REDIRECTED" = "1" ]; then
    exec 1>&3 2>&4 2>/dev/null || true
    exec 3>&- 4>&- 2>/dev/null || true
    BUILD_LOG_REDIRECTED=0
  fi

  if [ -n "$TEE_PID" ] && kill -0 "$TEE_PID" 2>/dev/null; then
    kill "$TEE_PID" 2>/dev/null || true
    wait "$TEE_PID" 2>/dev/null || true
  fi

  [ -n "$LOG_PIPE" ] && rm -f "$LOG_PIPE"
}

trap cleanup_build_log_pipe EXIT INT TERM

if ! mkfifo "$LOG_PIPE"; then
  echo "Failed to create build log pipe: $LOG_PIPE" >&2
  exit 1
fi

tee build.log < "$LOG_PIPE" &
TEE_PID=$!
if ! kill -0 "$TEE_PID" 2>/dev/null; then
  echo "Failed to start build log tee" >&2
  exit 1
fi

exec 3>&1 4>&2
exec > "$LOG_PIPE" 2>&1
BUILD_LOG_REDIRECTED=1
rm -f "$LOG_PIPE"

# Resolve branch name (build-msg.js has exhaustive CI provider fallbacks)
BRANCH_NAME="${BRANCH_NAME:-${COOLIFY_BRANCH:-}}"
if [ -z "$BRANCH_NAME" ] && [ -d .git ]; then
  BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi
BRANCH_NAME="${BRANCH_NAME#refs/heads/}"
BRANCH_NAME="${BRANCH_NAME#refs/tags/}"
BRANCH_NAME="${BRANCH_NAME#refs/}"

START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME_TS=$(date -u +"%s")

echo ""
echo "======================="
echo "🔨 New build started"
[ -n "$BRANCH_NAME" ] && echo "🌿 $BRANCH_NAME"
echo "======================="
echo ""

# 1. Pull metadata (protocols, chains, etc.) and generate robots.txt
if ! bun run build:metadata; then
  echo "🚨 Metadata pull failed, aborting build"
  BUILD_STATUS=1
fi

# 2. Run Next.js build, capturing output for log upload
if [ "${BUILD_STATUS:-0}" -eq 0 ]; then
  bun --bun next build
  BUILD_STATUS=$?
else
  echo "Skipping next build due to earlier failure"
fi

# Calculate build duration
BUILD_TIME_SEC=$(($(date -u +"%s") - START_TIME_TS))
BUILD_TIME_MIN=$((BUILD_TIME_SEC / 60))
BUILD_TIME_STR=$(printf "%ss" $((BUILD_TIME_SEC % 60)))
if [ $BUILD_TIME_MIN -gt 0 ]; then
  BUILD_TIME_STR=$(printf "%sm %s" $BUILD_TIME_MIN "$BUILD_TIME_STR")
fi

# Extract build ID from the hashed static directory name
BUILD_MANIFEST="$(find .next -name _buildManifest.js -print -quit 2>/dev/null || true)"
BUILD_ID=""
if [ -n "$BUILD_MANIFEST" ]; then
  BUILD_ID="$(basename "$(dirname "$BUILD_MANIFEST")")"
fi

echo ""
echo "======================="
if [ $BUILD_STATUS -eq 0 ]; then
  echo "🎉 Build succeeded in $BUILD_TIME_STR"
else
  echo "🚨 Build failed in $BUILD_TIME_STR"
fi
echo "📅 Build started at: $START_TIME"
[ -n "$BUILD_ID" ] && echo "📦 Build ID: $BUILD_ID"
echo "======================="
[ -n "$BRANCH_NAME" ] && echo "🌿 [$BRANCH_NAME]"
echo "======================="
echo ""
# 3. Sync static assets to/from R2 so new deployments can serve old build chunks
if [ "${SKIP_ARTIFACT_SYNC:-0}" = "1" ]; then
  echo "SKIP_ARTIFACT_SYNC=1, skipping rclone sync"
elif [ $BUILD_STATUS -eq 0 ]; then
  rclone --config scripts/rclone.conf copy ./.next/static artifacts:defillama-app-artifacts
  rclone --config scripts/rclone.conf copy artifacts:defillama-app-artifacts ./.next/static
else
  echo "Build failed, skipping .next artifact sync"
fi

exec 1>&3 2>&4
exec 3>&- 4>&-
wait "$TEE_PID"
TEE_PID=""
BUILD_LOG_REDIRECTED=0
trap - EXIT INT TERM

# 4. Send build status notification to Discord
export BUILD_STATUS BUILD_TIME_STR START_TIME BUILD_ID BRANCH_NAME
if [ "${SKIP_BUILD_NOTIFY:-0}" = "1" ]; then
  echo "SKIP_BUILD_NOTIFY=1, skipping Discord notification"
else
  bun ./scripts/build-msg.js
fi

exit $BUILD_STATUS
