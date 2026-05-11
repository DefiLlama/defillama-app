#!/bin/sh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

run_step() {
	name="$1"
	shift
	started_at="$(date +%s)"

	printf '[dev:prepare] %s started\n' "$name"

	if "$@"; then
		finished_at="$(date +%s)"
		duration=$((finished_at - started_at))
		printf '[dev:prepare] %s finished in %ss\n' "$name" "$duration"
		return 0
	else
		exit_code="$?"
		printf '[dev:prepare] %s failed with exit code %s\n' "$name" "$exit_code"
		return "$exit_code"
	fi
}

printf '[dev:prepare] Preparing local data before Next.js starts\n'
run_step "Metadata cache" bun scripts/pullMetadata.ts
run_step "Dataset cache" bun scripts/buildDatasetCache.ts
run_step "robots.txt" bun scripts/generateRobots.js
printf '[dev:prepare] Preparation complete; starting Next.js dev server\n'
