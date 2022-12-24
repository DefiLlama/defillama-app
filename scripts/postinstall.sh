#!/bin/sh

# source .env if it exists
set -a
[ -f .env ] && . .env

if [ -z "$NOT_VERCEL" ]; then
  echo "NOT_VERCEL is not set, skipping patching"
  exit 0
fi

patch ./node_modules/next/dist/server/send-payload/revalidate-headers.js <scripts/revalidate-headers.patch
