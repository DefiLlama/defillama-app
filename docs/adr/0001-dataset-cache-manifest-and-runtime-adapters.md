# ADR 0001: Dataset Cache Manifest Availability And Container Readers

## Status

Accepted

## Context

The dataset cache previously represented failed domain builds as `builtAt: 0` while still accepting the manifest as valid. Runtime readers then discovered missing domain files later as filesystem errors.

Routes also repeated cache/network selection directly, combining `DATASET_CACHE_DISABLE`, dynamic imports, cache reader names, network fallback names, and local error handling. Several dataset domains now have clear product owners under `src/containers`.

## Decision

Use a v2 dataset manifest where each domain is explicitly `ready` or `failed`.

Runtime readers live in the owning container's `server/` folder when a domain has a clear product owner. They call the cache reader when cache is enabled, fall back to the network fetcher only when the manifest marks that domain as `failed`, and let corrupt files in `ready` domains fail loudly.

`src/server/datasetCache` owns shared manifest parsing, artifact layout, JSON helpers, and build orchestration. Domain-specific builders should stay under `containers/<Domain>/server` unless the domain is genuinely shared.

## Consequences

Routes no longer need to know how dataset cache availability is represented.

Operators can distinguish a domain that was skipped during cache generation from a cache domain whose files are missing or corrupt.

Server-only cache modules stay out of client bundles by being imported only from `getStaticProps`, `getServerSideProps`, `getStaticPaths`, API routes, route-cache code, build commands, or tests for those paths.

Existing v1 manifests are not supported. Regenerate `.cache` after this change.
