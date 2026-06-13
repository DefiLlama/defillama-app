# Framework-neutral API layer

All JSON API route logic lives here, written against the neutral `ApiRequest`/`ApiResult`
model in `types.ts` with **no Next.js imports**. Files under `src/pages/api/**` are
thin adapters:

```ts
import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaAssetBreakdown } from '~/server/api/routes/rwa'

export default toNextHandler(rwaAssetBreakdown)
```

Scope note: routes consumed only by `containers/Investors`,
`containers/Research`, or `containers/ProDashboard` (plus `api/private/**` and
`api/dynamic/dashboard/**`) are intentionally left on their original handlers —
convert them only when their owners ask. Routes shared between those and normal
pages (income-statement, yields datasets) are converted. To classify a route,
grep its URL and look at which containers fetch it.

Porting to another host (standalone service, TanStack Start) means rewriting
`nextAdapter.ts` (~80 lines) and the thin files — nothing else.

## Modules

- `types.ts` — `ApiRequest`, `ApiResult`, `defineApiRoute`
- `respond.ts` — `ok` / `badRequest` / `notFound` / `upstreamError` result constructors
- `params.ts` — query param parsing (`queryString`, `queryList`, `queryEnum`, `queryBoolean`, `queryIntClamped`, `queryFilterMode`)
- `proxy.ts` — `proxyJsonRoute` for plain JSON passthroughs
- `resultCache.ts` — in-process TTL memoization with in-flight coalescing
- `nextAdapter.ts` — the only Next.js-aware file: method guard, telemetry, Cache-Control policy, error fencing
- `routes/*.ts` — route definitions grouped by domain

## Conventions

- **Method guard**: declare `methods` (default `['GET']`); the adapter answers 405 otherwise.
- **Cache-Control**: set `cacheControl` on the definition for 2xx responses; the adapter
  jitters `s-maxage >= 600` to spread CDN expiry and sends `no-store` on every non-2xx
  so transient failures are never cached. A handler can override per-response via
  `headers`.
- **Errors**: invalid params → `badRequest` (400); upstream failure → `upstreamError`
  (502, after `recordRouteRuntimeError`); uncaught exceptions become a recorded 500 in
  the adapter. Upstream failures must never surface as 500.
- **Heavy work**: anything that fans out to several upstream calls or runs multi-second
  JS aggregation must go through `cachedResult` so concurrent identical requests share
  one computation and the event loop is protected from repeat work. Key by the full
  param set, never by a subset.
- **Telemetry**: `route` strings keep their historical values (`/api/...`) so dashboards
  stay continuous.
- **Streams stay native**: SSE and binary routes (`dashboard/[dashboardId]/stream`,
  `sonic/burn-stream`, icon proxies) cannot return a single `ApiResult`; they remain
  plain Next handlers, marked with `// port: framework-native (streaming)` at the top.
