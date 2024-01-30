#!/bin/bash

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

apply_patch() {
  local file_to_patch="$1"
  local patch_file="$2"

  # Check if the patch is already applied
  if patch -R --dry-run -s -f -p1 <"$patch_file" >/dev/null; then
    echo "Patch already applied to $file_to_patch, skipping..."
    return 0
  else
    echo "Applying patch to $file_to_patch..."
    if patch "$file_to_patch" <"$patch_file"; then
      echo "Patch applied successfully to $file_to_patch"
      return 0
    else
      echo "Failed to apply patch to $file_to_patch"
      return 1
    fi
  fi
}

apply_patch ./node_modules/next/dist/server/send-payload.js scripts/send-payload.patch
apply_patch ./node_modules/next/dist/server/lib/revalidate.js scripts/revalidate.patch
apply_patch ./node_modules/next/dist/server/base-server.js scripts/base-server.patch
