#!/bin/sh

# test to see if both env vars CF_PURGE_CACHE_AUTH and CF_ZONE is set
if [ -z "$CF_PURGE_CACHE_AUTH" ] || [ -z "$CF_ZONE" ]; then
  echo "CF_PURGE_CACHE_AUTH or CF_ZONE is not set. Skipping cache purge."
  exit 0
fi

curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_PURGE_CACHE_AUTH" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
