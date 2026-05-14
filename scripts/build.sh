#!/bin/bash
#
# Compatibility wrapper for the TypeScript deploy build command.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || { echo "Failed to cd to $REPO_ROOT"; exit 1; }

JITI_ALIAS="$(printf '{"~/public":"%s/public","~/public/*":"%s/public/*","~":"%s/src","~/*":"%s/src/*"}' "$REPO_ROOT" "$REPO_ROOT" "$REPO_ROOT" "$REPO_ROOT")"
JITI_JSX=1 JITI_ALIAS="$JITI_ALIAS" exec node ./node_modules/jiti/lib/jiti-cli.mjs scripts/command/deployBuildCli.ts
