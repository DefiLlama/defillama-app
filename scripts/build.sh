#!/bin/bash

# Ensure we run from repo root (so .env/.next paths and git work when present)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# source .env if it exists
set -a
[ -f .env ] && . .env

BRANCH_NAME="${BRANCH_NAME:-${COOLIFY_BRANCH:-${GIT_BRANCH:-${CI_COMMIT_REF_NAME:-${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-${GITHUB_REF:-${VERCEL_GIT_COMMIT_REF:-}}}}}}}}"

# fallback to git if available (often absent in Docker builds)
if [ -z "$BRANCH_NAME" ] && [ -d .git ]; then
  BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi

# normalize branch refs (refs/heads/foo -> foo)
BRANCH_NAME="${BRANCH_NAME#refs/heads/}"
BRANCH_NAME="${BRANCH_NAME#refs/tags/}"
BRANCH_NAME="${BRANCH_NAME#refs/}"
# starting time in UTC string and timestamp (for calculating build duration)
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME_TS=$(date -u +"%s")

echo ""
echo "======================="
echo "🔨 New build started"
echo "🌿 $BRANCH_NAME"
echo "======================="
echo ""

bunx next build 2>&1 | tee build.log
BUILD_STATUS=${PIPESTATUS[0]}

BUILD_TIME_SEC=$(($(date -u +"%s") - $START_TIME_TS))
BUILD_TIME_MIN=$(($BUILD_TIME_SEC / 60))
BUILD_TIME_STR=$(printf "%ss" $(($BUILD_TIME_SEC % 60)))
if [ $BUILD_TIME_MIN -gt 0 ]; then
  BUILD_TIME_STR=$(printf "%sm %s" $BUILD_TIME_MIN $BUILD_TIME_STR)
fi

# find the parent directory name of the file _buildManifest.js within the .next/static directory
BUILD_ID=$(find .next -name _buildManifest.js | sed 's/\/_buildManifest.js//g' | sed 's/\.next\/static\///g')

echo ""
echo "======================="
if [ $BUILD_STATUS -eq 0 ]; then
  echo "🎉 Build succeeded in $BUILD_TIME_STR"
else
  echo "🚨 Build failed in $BUILD_TIME_STR"
fi
echo "📅 Build started at: $START_TIME"
if [ -n "$BUILD_ID" ]; then
  echo "📦 Build ID: $BUILD_ID"
fi
echo "======================="
echo "🌿 [$BRANCH_NAME]"
echo "======================="
echo ""

if [ $BUILD_STATUS -eq 0 ]; then
  rclone --config scripts/rclone.conf copy ./.next/static artifacts:defillama-app-artifacts
  rclone --config scripts/rclone.conf copy artifacts:defillama-app-artifacts ./.next/static
else
  echo "Build failed, skipping .next artifact sync"
fi

bun ./scripts/build-msg.js $BUILD_STATUS "$BUILD_TIME_STR" "$START_TIME" "$BUILD_ID" "$BRANCH_NAME"

# exit with the build status
exit $BUILD_STATUS
