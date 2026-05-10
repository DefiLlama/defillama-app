# DefiLlama App Context

## Dataset Cache

The dataset cache is the generated `.cache/datasets` tree used by server-side routes that need large upstream datasets at runtime. Each subdirectory is a dataset cache domain, such as `yields`, `liquidations`, or `markets`.

The dataset manifest is the availability contract for this tree. A domain marked `ready` means its files should exist and corruption should fail loudly. A domain marked `failed` means the build skipped that slice and runtime domain modules may fall back to the network adapter.

## Metadata Artifacts

Metadata artifacts are the generated `.cache/*.json` files imported by `src/utils/metadata`. Their filenames, CI stubs, initial runtime cache shape, and refresh application live behind the metadata artifact module so the artifact contract stays in one place.

## Runtime Domain Modules

Runtime domain modules choose between a dataset cache adapter and a network adapter. Pages and API routes should call these modules instead of checking `DATASET_CACHE_DISABLE` or dynamically importing cache readers directly.
