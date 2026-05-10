# ADR 0002: Metadata Manifest And Pull Command Modules

## Status

Accepted

## Context

Metadata artifacts are small generated `.cache/*.json` files that are statically imported by `src/utils/metadata`. The pull command also owned freshness, local-dev stubs, CI failure stubs, Tasty metrics, page ordering, and trending route generation in one script.

That made the command a shallow Module: callers and maintainers had to understand several unrelated policies before changing one of them.

## Decision

Use `.cache/metadata-manifest.json` as the freshness and artifact-status contract for metadata artifacts. The manifest records the artifact version, pull timestamp, status (`ready` or `stub`), and artifact filenames.

Keep the generated `.cache/*.json` filenames unchanged and separate from `.cache/datasets/*`. Metadata artifacts remain statically imported. Dataset cache remains runtime-loaded through its own manifest and runtime domain Modules.

Convert the pull command to TypeScript and split its implementation into Modules for artifact writing, freshness, stub policy, Tasty metrics, page ordering, and trending route generation.

## Consequences

Local contributors without an API key can still start the dev server by generating empty stub artifacts. Production metadata pull failures remain loud.

The old `.cache/lastPull.json` marker is not supported. Regenerate `.cache` after this change.
