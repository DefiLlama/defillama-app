#!/bin/sh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

bun scripts/pullMetadata.ts
bun scripts/buildDatasetCache.ts
bun scripts/generateRobots.js
