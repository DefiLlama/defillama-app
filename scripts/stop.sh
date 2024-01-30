#!/bin/bash

# source .env if it exists
set -a
[ -f .env ] && . .env

pm2 delete ecosystem.config.js

COMMIT_HASH=$(git rev-parse --short HEAD)
APP_NAME=dla-$COMMIT_HASH

# post message to discord
if [ -z "$BUILD_STATUS_WEBHOOK" ]; then
  echo "BUILD_STATUS_WEBHOOK is not set, skipping post message to discord"
  exit 0
fi

curl -H "Content-Type: application/json" -X POST -d '{"content": "'$APP_NAME' stopped successfully"}' $BUILD_STATUS_WEBHOOK
