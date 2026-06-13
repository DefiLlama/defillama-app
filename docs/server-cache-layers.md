# Server Cache Layers

The app uses three server-side cache layers with different lifetimes and responsibilities.

## Dataset Cache

`src/server/datasetCache` owns durable, prebuilt domain artifacts. Builders write JSON files and a manifest under `.cache/datasets`; runtime adapters read those files through `readThroughDatasetCache`.

Use this when a domain can prepare shared data ahead of requests or reuse a durable artifact across many pages and APIs. Domain-owned readers live in `src/containers/<Domain>/server/*.cache.ts`; runtime consumers should call `dataset.ts`, `datasetApi.ts`, or domain API handlers instead of opening artifacts directly.

## JSON Cache

`src/server/datasetCache/jsonCache.ts` is the in-process memoization layer for reading dataset artifact files. It avoids parsing the same JSON file repeatedly while still allowing background refresh when the file changes.

Most dataset-backed routes do not need `resultCache` on top of this. If the request only reads an artifact and does light filtering, the JSON cache is already the right hot-path optimization.

## Result Cache

`src/server/api/resultCache.ts` memoizes final server-side computations by namespace and key. It is in-process, TTL-based, and coalesces concurrent identical requests onto one promise. Failed computations are not cached.

Use this for anonymous, param-bounded work where recomputation blocks the event loop or repeats an expensive upstream fetch and parse. Good examples are breakdown aggregations, page-data chart computations, or direct proxy routes for large upstream payloads.

Do not use it for authenticated or user-specific data, routes that must be instantly fresh, unbounded key spaces, or dataset-backed routes that only read cached artifacts cheaply.

## How They Stack

The layers can stack, but only intentionally:

`datasetCache` prepares durable domain artifacts.
`jsonCache` memoizes reads of those artifact files in each process.
`resultCache` memoizes expensive final route results or direct upstream proxy responses.

Add `resultCache` after dataset reads only when there is still meaningful per-query aggregation, fan-out, or response shaping after the artifact is loaded.
