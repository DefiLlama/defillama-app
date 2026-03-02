#!/bin/bash
#
# Full build pipeline: metadata → next build → rclone artifact sync → discord notification.
# Called by the Dockerfile builder stage and can also be run locally.

set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Source .env for local builds (Docker builds get env vars via ARGs/secrets)
set -a
[ -f .env ] && . .env
set +a

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
bun run build:metadata

# 2. Run Next.js build, capturing output for log upload
bunx next build 2>&1 | tee build.log
BUILD_STATUS=${PIPESTATUS[0]}

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
if [ $BUILD_STATUS -eq 0 ]; then
  rclone --config scripts/rclone.conf copy ./.next/static artifacts:defillama-app-artifacts
  rclone --config scripts/rclone.conf copy artifacts:defillama-app-artifacts ./.next/static
else
  echo "Build failed, skipping .next artifact sync"
fi

# 4. Send build status notification to Discord
export BUILD_STATUS BUILD_TIME_STR START_TIME BUILD_ID BRANCH_NAME
bun ./scripts/build-msg.js

exit $BUILD_STATUS
