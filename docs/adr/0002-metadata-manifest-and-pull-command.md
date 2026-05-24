# ADR 0002: Metadata Manifest And Pull Command Modules

## Status

Accepted

## Context

Metadata artifacts are small generated `.cache/app-metadata/*.json` files loaded by `src/utils/metadata` at server boot. The pull command also owned freshness, local-dev stubs, CI failure stubs, Tasty metrics, page ordering, and trending route generation in one script.

That made the command a shallow Module: callers and maintainers had to understand several unrelated policies before changing one of them.

## Decision

Use `.cache/app-metadata/manifest.json` as the freshness and artifact-status contract for metadata artifacts. The manifest records the artifact version, pull timestamp, status (`ready` or `stub`), and artifact filenames.

Keep the generated `.cache/app-metadata/*.json` filenames unchanged and separate from `.cache/datasets/*`. Metadata artifacts are loaded through a typed registry and included in standalone traces through `outputFileTracingIncludes`. Dataset cache remains runtime-loaded through its own manifest and runtime domain Modules.

Update 2026-05-20: metadata artifacts moved from the `.cache` root into `.cache/app-metadata/` so the generated artifact root contains separate app metadata and dataset cache trees.

Convert the pull command to TypeScript and split its implementation into Modules for artifact writing, freshness, stub policy, Tasty metrics, page ordering, and trending route generation.

Update 2026-05-24: the metadata cache no longer statically imports generated JSON artifacts. `.cache/app-metadata` is the boot snapshot, and runtime refresh updates only the in-memory metadata cache after a complete backend JSON payload is fetched and parsed. Failed runtime refreshes preserve the current cache. Metadata artifact publishing and site navigation publishing are separate prepare steps.

## Consequences

Local contributors without an API key can still start the dev server by generating empty stub artifacts. Production metadata pull failures remain loud.

The old `.cache/lastPull.json` and `.cache/metadata-manifest.json` markers are not supported. Regenerate `.cache` after this change.
