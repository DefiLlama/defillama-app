#!/bin/sh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

exec node ./scripts/command/runTsCommand.mjs scripts/command/postStartHookCli.ts
