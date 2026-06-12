# Markets

Markets owns the `/markets` page surface for spot and perpetual market data: token/category overview tables, venue tables, exchange detail views, and category detail views.

Start from `src/pages/markets.tsx`, then follow imports here. This container is intentionally local; do not move markets-server cache rules into shared metric modules unless another container consumes the same invariant.

## Main Files

- `api.ts`: client fetchers for the local `/api/public/markets/*` endpoints.
- `api.types.ts`: markets-server response DTOs reused by Markets, Token, and CEX views.
- `types.ts`: UI/read-model types consumed by components and helpers.
- `normalizers.ts`: direct mapping from markets-server DTOs to UI/read-model types.
- `segments.ts`: segment constants and route/UI segment helpers.
- `utils.ts`: pure table/chart helpers and fallback aggregations.
- `shared.tsx` and `marketMetrics.tsx`: small shared rendering helpers.
- `MarketsHome.tsx`, `MarketsExchange.tsx`, `MarketsCategory.tsx`: top-level route modes.

## Data Flow

```text
src/pages/markets.tsx
  -> MarketsHome / MarketsExchange / MarketsCategory
  -> api.ts fetcher
  -> normalizers.ts
  -> table/chart components
```

The public API proxy routes live in `src/pages/api/public/markets/*`. Those routes forward cache files from the markets server; this container consumes the forwarded payloads.

## API Shape Rules

- Trust markets-server payloads and aggregate fields.
- Keep response contracts in `api.types.ts`.
- Keep executable mapping code out of `types.ts`.
- Do not add alternate field aliases, string-number parsing, or malformed-response recovery.
- If a defensive check is genuinely required at a route or browser boundary, add a short comment explaining why that boundary can be untyped.

## Performance Notes

Markets tables and charts can process large token, venue, and series arrays. Prefer single-pass loops for hot transforms, and avoid chained `filter`/`map`/`reduce` work when the same result can be accumulated once.

## Tests

Focused command:

```bash
bun run test src/containers/Markets/__tests__/segments.test.ts src/containers/Markets/__tests__/utils.test.ts src/containers/Markets/__tests__/normalizers.test.ts src/containers/Markets/__tests__/shared.test.tsx
```

For source changes, follow the repo root verification instructions.
