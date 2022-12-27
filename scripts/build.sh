#!/bin/sh

# source .env if it exists
set -a
[ -f .env ] && . .env

# find the last commit hash and commit comment and author
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_COMMENT=$(git log -1 --pretty=%B)
# starting time in UTC string and timestamp (for calculating build duration)
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME_TS=$(date -u +"%s")

echo "Using shell $SHELL"
echo ""
echo "======================="
echo "🔨 New build started"
echo "💬 $COMMIT_COMMENT"
echo "🦙 $COMMIT_AUTHOR"
echo "📸 $COMMIT_HASH"
echo "======================="
echo ""

BUILD_STATUS=1
next build || BUILD_STATUS=$?

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
BUILD_SUMMARY=""
if [ $BUILD_STATUS -eq 0 ]; then
  BUILD_SUMMARY+="🎉 Build succeeded in $BUILD_TIME_STR"
else
  BUILD_SUMMARY+="🚨 Build failed in $BUILD_TIME_STR"
fi
BUILD_SUMMARY+="\n📅 Build started at: $START_TIME"
if [ -n "$BUILD_ID" ]; then
  BUILD_SUMMARY+="\n📦 Build ID: $BUILD_ID"
fi
echo $BUILD_SUMMARY
echo "======================="
COMMIT_SUMMARY=""
COMMIT_SUMMARY+="💬 [$COMMIT_COMMENT]"
COMMIT_SUMMARY+="\n🦙 $COMMIT_AUTHOR"
COMMIT_SUMMARY+="\n📸 $COMMIT_HASH"
echo $COMMIT_SUMMARY
echo "======================="
echo ""

if [ -z "$NOT_VERCEL" ]; then
  echo "NOT_VERCEL is not set, skipping discord notification"
  exit $BUILD_STATUS
fi

# send a message to Discord using the Discord webhook URL, if BUILD_STATUS_WEBHOOK is set
MESSAGE=$BUILD_SUMMARY
MESSAGE+="\n$COMMIT_SUMMARY"
if [ -n "$BUILD_STATUS_WEBHOOK" ]; then
  curl -X POST -H "Content-Type: application/json" -d "{\"content\": \"\`\`\`\n$MESSAGE\n\`\`\`\"}" $BUILD_STATUS_WEBHOOK
fi

if [ $BUILD_STATUS -ne 0 ] && [ -n "$BUILD_STATUS_WEBHOOK" ]; then
  if [ -n "$BUILD_STATUS_LLAMAS" ]; then
    LLAMA_MENTIONS=""
    for LLAMA in $(echo $BUILD_STATUS_LLAMAS | sed "s/,/ /g"); do
      LLAMA_MENTIONS+="<@!$LLAMA> "
    done
    curl -X POST -H "Content-Type: application/json" -d "{\"content\": \"<:tiresome:1023676964319535286> $LLAMA_MENTIONS\n<:binoculars:1012832136459456582> $BUILD_STATUS_DASHBOARD\"}" $BUILD_STATUS_WEBHOOK
  fi
else
  curl -X POST -H "Content-Type: application/json" -d "{\"content\": \"<:llamacheer:1012832279195832331>\"}" $BUILD_STATUS_WEBHOOK
fi

# exit with the build status
exit $BUILD_STATUS
