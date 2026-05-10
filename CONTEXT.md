# DefiLlama App Context

## Dataset Cache

The dataset cache is the generated `.cache/datasets` tree used by server-side routes that need large upstream datasets at runtime. Each subdirectory is a dataset cache domain, such as `yields`, `liquidations`, or `markets`.

The dataset manifest is the availability contract for this tree. A domain marked `ready` means its files should exist and corruption should fail loudly. A domain marked `failed` means the build skipped that slice and runtime domain modules may fall back to the network adapter.

Dataset cache artifacts are runtime-loaded from disk through the dataset JSON cache. This differs from metadata artifacts because dataset domains can be large, route-specific, and rebuilt behind a manifest without bundling every artifact into Next.js.

## Metadata Artifacts

Metadata artifacts are the generated `.cache/*.json` files imported by `src/utils/metadata`. Their filenames, CI stubs, initial runtime cache shape, and refresh application live behind the metadata artifact module so the artifact contract stays in one place.

The metadata manifest is `.cache/metadata-manifest.json`. It records whether the static metadata artifacts are a `ready` pull or a local/CI `stub` set, and replaces the older `.cache/lastPull.json` freshness marker.

The metadata pull command is a thin command Adapter around metadata artifact publishing. Page ordering, Tasty metrics, upstream source fetching, and local/CI stub policy live in separate Modules so each reason to change stays local.

Metadata artifacts are statically imported and refreshed in memory. Local/CI metadata stubs intentionally demote upstream failures into empty artifacts so contributors can start the dev server without private API access. Dataset cache strict mode goes the other direction: it escalates partial domain build failures when operators need a complete runtime cache.

## Runtime Domain Modules

Runtime domain modules choose between a dataset cache adapter and a network adapter. Pages and API routes should call these modules instead of checking `DATASET_CACHE_DISABLE` or dynamically importing cache readers directly.
