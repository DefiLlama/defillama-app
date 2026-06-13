# Markets

Markets owns the `/markets` page surface for spot and perpetual market data: token/category overview tables, venue tables, exchange detail views, and category detail views.

`api.types.ts` is the source of truth for markets-server DTOs. This README documents field semantics that are easy to misread when wiring tables, charts, or route lookups.

## API Field Semantics

### Segments

- `segment` is one of `spot`, `linear_perp`, or `inverse_perp`.
- Segment priority is `spot`, then `linear_perp`, then `inverse_perp`. The CEX route resolver preserves this order when multiple segment rows share the same `defillama_slug`.
- `spot` has no open interest, funding, or leverage semantics. Perp-only columns should be gated with `segmentHasOi(segment)`.

### Time Series

- `days` in series responses is a number, normally `30`. It is not an array of day values.
- Row-level `day` is Unix seconds. Do not convert it to milliseconds in Markets helpers; chart components consume seconds.
- `last_updated` is metadata for freshness display/debugging, not a chart axis value.

### Volume, Price, OI, Funding

- `volume_24h` is current 24h USD notional volume. `volume_prev_24h` is the previous 24h window. Pair rows may use nullable volume fields; aggregate token/category rows use non-null current volume.
- Exchange list rows use aggregate names: `total_volume_24h`, `total_volume_prev_24h`, `total_oi_usd`, and `total_oi_prev_usd`. Keep these names in exchange-table rows instead of aliasing them to token/category names.
- Spot entries in `exchanges/list.json` omit `total_oi_usd`, `total_oi_prev_usd`, `supports_oi`, and `supports_funding`. Perp entries include them.
- `price_change_24h` is a fraction, not a percent. `0.05` means `+5%`.
- `funding_rate_8h` is a fraction, not a percent. `0.0001` means `0.01%` over the 8h funding period.
- `oi_usd` and `oi_prev_usd` are USD open interest values. Use `oi_usd` for UI dollar displays. Pair-level `oi` is the backend's non-USD open interest value and should not be used for dollar charts.

### Market Identity

- `market_type` is `spot` or `perpetual`. Do not introduce `futures`; this app treats perpetuals as the only derivative market type here.
- `contract_type` is `''`, `linear`, or `inverse`. Spot pairs use the empty string, not `spot`.
- `settle_asset` is a backend string field and can be empty for spot-like rows. Do not infer market type from it.
- `symbol` is the display/search pair or token symbol from the backend. Token/category row symbols should not be renamed to `base` in Markets read models.
- `category` is the category-list/category-series identity field. Token rows have `tags`, not `category`.

### Venue Identity

- Exchange series rows include `exchange_type` from the backend.
- Exchange list responses are split under `cex` and `dex`; `normalizers.ts` adds `exchange_type` only when merging those two lists for the UI table.
- `defillama_slug` is nullable. It is only used when present to resolve app CEX routes to markets-server exchange IDs.
- `exchange` is the markets-server exchange ID used by markets API paths and chart/table rows.

## Allowed Frontend Transforms

Keep backend DTO field names in component rows. The frontend should only reshape data when the shape materially changes:

- group token list rows into `Record<Segment, SymbolStat[]>`;
- group category list rows into `Record<Segment, CategoryStat[]>`;
- merge CEX and DEX exchange list rows while adding `exchange_type`;
- complete category page `segments` and `tokens` records so every segment key exists;
- derive local dataset-cache indexes for route membership lookups.

Avoid rename-only normalizers such as `volume_24h` to `volume_24h_usd`, `funding_rate_8h` to `funding_avg_8h`, or `symbol` to `base`.

## Dataset Cache Indexes

The app derives small Markets indexes during dataset-cache builds:

- `token-symbols.json`: `Record<lowercaseSymbol, true>` for token page `hasMarkets`.
- `cex-by-defillama-slug.json`: `Record<slug(defillama_slug), { exchange, defillama_slug }>` for CEX route lookup.

These indexes are derived from already-fetched `tokens-list.json` and `exchanges-list.json`; they do not add backend calls or change public API responses.

## Main Files

- `api.types.ts`: markets-server response DTOs reused by Markets, Token, and CEX views.
- `api.ts`: client fetchers for local `/api/public/markets/*` endpoints.
- `types.ts`: derived aliases for frontend read models that are not raw API responses.
- `normalizers.ts`: structural transforms only.
- `segments.ts`: segment constants and helpers.
- `utils.ts`: pure table/chart helpers and fallback aggregations.

For source changes, follow the repo root verification instructions.
