# Dataset Cache Route Boundaries

Dataset-backed pages and APIs follow this flow:

`dataset builders -> manifest/artifacts -> runtime adapters -> page/API consumers -> proxy routes`

## Flow

Dataset builders declare domains and artifact files in `src/server/datasetCache`. Build orchestration writes the artifact JSON files and manifest entries before the app build. The manifest tells runtime code whether a domain is ready, failed, disabled, or missing.

Raw artifact readers live in domain `server/*.cache.ts` modules. They should only deserialize files and convert cache integrity problems into normal exceptions.

Runtime adapters live in `dataset.ts`, `datasetApi.ts`, or more specific `dataset.*.ts` modules. These modules call `readThroughDatasetCache`, which reads artifacts when the manifest says the domain is ready, falls back to network when a domain is explicitly failed or disabled, and fails loudly when a ready domain has corrupt or missing files.

Artifact JSON reads go through `src/server/datasetCache/jsonCache.ts`, which memoizes parsed files in process. Do not add `src/server/api/resultCache.ts` to dataset-backed routes just because they read artifacts; add it only when there is still expensive per-query aggregation, fan-out, or response shaping after the artifact read. See `docs/server-cache-layers.md` for the full cache-layer map.

Page, API, and proxy consumers should call runtime adapters or domain HTTP handlers. Next.js files under `src/pages/api` should stay thin and delegate to `src/containers/<Domain>/server/api.ts`, `*Routes.ts`, or shared route helpers through the API route catalog.

## Import Rules

- `dataset.cache.ts`: raw artifact readers only. These modules may import dataset cache internals.
- `dataset.ts` / `datasetApi.ts`: runtime read-through adapters. These modules may import `*.cache` and network fetchers, then decide through `readThroughDatasetCache`.
- `routes.ts`: sitemap and static route param assembly only. If route generation needs cache-only data, hide that read behind a small domain `routeData.ts` helper instead of importing `dataset.cache` directly.
- `api.ts` / `*Routes.ts`: HTTP route handlers. They should call runtime adapters or domain query services, not raw cache files.
- `src/pages/**`: never import `server/*.cache`. Public/private/dynamic API files should delegate to domain server handlers rather than opening artifacts directly.

## Failure Modes

Failed manifest domains fall back to the network in runtime adapters. This keeps pages and API routes usable when the cache build records an upstream failure.

Ready manifest domains do not fall back on corrupt artifacts. Missing files, invalid JSON, or schema-level integrity errors indicate a bad build artifact and should fail loudly so the build/runtime problem is visible.

Sitemap generation is intentionally cache-only. It should isolate section failures so one missing cold-cache section does not prevent other sitemap sections from being emitted.

## Breakdown Metric Sets

By-chain breakdown metrics use separate constants for separate concerns:

- `NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS`: metrics owned outside AdapterMetrics by-chain routes, currently TVL, stablecoins, and chain-native metrics.
- `PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS`: by-chain metrics that only support `protocol=All`, currently stablecoins, chain-fees, and chain-revenue.
- `STREAM_PROTOCOL_SERIES_SKIP_METRICS`: metrics skipped by the dashboard stream protocol-series prefetch path, currently TVL plus protocol-unsupported metrics.
