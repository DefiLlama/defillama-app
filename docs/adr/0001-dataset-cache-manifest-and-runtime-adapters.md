# ADR 0001: Dataset Cache Manifest Availability And Runtime Adapters

## Status

Accepted

## Context

The dataset cache previously represented failed domain builds as `builtAt: 0` while still accepting the manifest as valid. Runtime readers then discovered missing domain files later as filesystem errors.

Routes also repeated cache/network selection directly, combining `DATASET_CACHE_DISABLE`, dynamic imports, cache reader names, network fallback names, and local error handling.

## Decision

Use a v2 dataset manifest where each domain is explicitly `ready` or `failed`.

Runtime domain modules are the seam between route code and data source selection. They call the cache adapter when cache is enabled, fall back to the network adapter only when the manifest marks that domain as `failed`, and let corrupt files in `ready` domains fail loudly.

## Consequences

Routes no longer need to know how dataset cache availability is represented.

Operators can distinguish a domain that was skipped during cache generation from a cache domain whose files are missing or corrupt.

Existing v1 manifests are not supported. Regenerate `.cache` after this change.
