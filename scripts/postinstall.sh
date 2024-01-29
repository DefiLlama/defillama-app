#!/bin/sh

# source .env if it exists
set -a
[ -f .env ] && . .env

if [ -z "$NOT_VERCEL" ]; then
  echo "NOT_VERCEL is not set, skipping patching"
  exit 0
fi

if ! grep -q '"next": "14.1.0"' package.json; then
  echo "Next.js version is not 14.1.0, patching is not supported"
  exit 1
fi

patch ./node_modules/next/dist/server/send-payload.js <scripts/send-payload.patch
patch ./node_modules/next/dist/server/lib/revalidate.js <scripts/revalidate.patch
patch ./node_modules/next/dist/server/base-server.js <scripts/base-server.patch

echo "TODO: Patched Next.js"
