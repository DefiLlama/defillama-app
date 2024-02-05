#!/bin/bash

# source .env if it exists
set -a
[ -f .env ] && . .env

pm2 start ecosystem.config.js

COMMIT_HASH=$(git rev-parse --short HEAD)
APP_NAME=dla-$COMMIT_HASH

echo "Waiting for app to start..."
sleep 10

PM2_OUTPUT=$(pm2 list $APP_NAME)

TOTAL_COUNT=0
ONLINE_COUNT=0

while read -r line; do
  # Check if the line contains an instance entry
  if [[ $line =~ \│[[:space:]]+[0-9]+[[:space:]]+\│ ]]; then
    # Increment total count
    ((TOTAL_COUNT++))

    # Check if the instance is online
    if [[ $line =~ \│[[:space:]]+online[[:space:]]+\│ ]]; then
      # Increment online count
      ((ONLINE_COUNT++))
    fi
  fi
done <<<"$PM2_OUTPUT"

# Output the summary
echo "$ONLINE_COUNT/$TOTAL_COUNT online"

send_message() {
  if [ -z "$BUILD_STATUS_WEBHOOK" ]; then
    echo "BUILD_STATUS_WEBHOOK is not set, skipping post message to discord"
    return
  fi

  curl -H "Content-Type: application/json" -X POST -d "{\"content\": \"$APP_NAME startup $1\"}" $BUILD_STATUS_WEBHOOK
}

if [ $ONLINE_COUNT -ne $TOTAL_COUNT ]; then
  echo "Not all instances are online, stopping app..."
  pm2 delete ecosystem.config.js
  send_message "failed"
  exit 1
fi

echo "All instances are online"
send_message "succeeded, $ONLINE_COUNT/$TOTAL_COUNT online"
