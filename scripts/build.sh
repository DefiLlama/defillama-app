#!/bin/bash
#
# Compatibility wrapper for the TypeScript deploy build command.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || { echo "Failed to cd to $REPO_ROOT"; exit 1; }

exec node ./scripts/command/runTsCommand.mjs scripts/command/deployBuildCli.ts
