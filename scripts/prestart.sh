#!/bin/sh

# source .env if it exists
set -a
[ -f .env ] && . .env

# if CF_ZONE or CF_PURGE_CACHE_AUTH is not set, skip purge cache
if [ -z "$CF_ZONE" ] || [ -z "$CF_PURGE_CACHE_AUTH" ]; then
  echo "CF_ZONE or CF_PURGE_CACHE_AUTH is not set, skipping purge cache"
  exit 0
fi

echo "Purging cache for zone $CF_ZONE"

curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_PURGE_CACHE_AUTH" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
