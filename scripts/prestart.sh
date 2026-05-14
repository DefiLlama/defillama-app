#!/bin/sh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

JITI_ALIAS="$(printf '{"~/public":"%s/public","~/public/*":"%s/public/*","~":"%s/src","~/*":"%s/src/*"}' "$REPO_ROOT" "$REPO_ROOT" "$REPO_ROOT" "$REPO_ROOT")"
JITI_JSX=1 JITI_ALIAS="$JITI_ALIAS" exec node ./node_modules/jiti/lib/jiti-cli.mjs scripts/command/postStartHookCli.ts
