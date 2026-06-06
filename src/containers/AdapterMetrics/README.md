# AdapterMetrics

AdapterMetrics owns adapter-backed metric pages where the product surface ranks or charts protocol activity by chain, protocol, or adapter data type.

Start from the route file in `src/pages`, then follow imports here. Public route slugs are contracts; this folder name is only the implementation owner.

## Route Families

Common route families owned here:

- `/fees`, `/revenue`, `/holders-revenue`, `/earnings`, `/pf`, `/ps`
- `/fees/chain/[chain]`, `/revenue/chain/[chain]`, `/holders-revenue/chain/[chain]`, and related chain detail routes
- `/fees/chains`, `/revenue/chains`, `/app-fees/chains`, `/app-revenue/chains`, `/rev/chains`
- `/dexs`, `/perps`, `/dex-aggregators`, `/perps-aggregators`
- `/options/premium-volume`, `/options/notional-volume`
- `/bridge-aggregators`, `/open-interest`, `/normalized-volume`
- each supported `/chains` or `/chain/[chain]` variant for those metric families

For a broader route-to-container map, see `src/containers/README.md`.

## Main Files

- `constants.ts`: adapter type strings, adapter data type strings, compact data-type keys, and `getChainMetadataKey`.
- `api.ts`: upstream adapter metrics and chart fetchers.
- `queries.tsx`: page-data/read-model builders used by `getStaticProps`.
- `AdapterByChain.tsx`: table view for a selected chain or `All` chains, where rows are adapter protocols.
- `ChainsByAdapter.tsx`: chain ranking table view, where rows are chains.
- `ChainChart.tsx`: chart UI for chain detail and chain ranking pages.
- `ProtocolChart.tsx`: protocol chart UI used by adapter-backed protocol views.
- `utils.ts`: local table, grouping, matching, and chart transformation helpers.
- `metricPeriods.ts`: shared metric period field merging.
- `telemetry.ts`: adapter route telemetry helpers.
- `types.ts` and `api.types.ts`: UI/read-model types and upstream DTO types.

## Data Flows

Selected-chain or all-chain protocol table:

```text
src/pages/<adapter-route>/index.tsx
src/pages/<adapter-route>/chain/[chain].tsx
  -> getAdapterByChainPageData(...)
  -> AdapterByChain
  -> AdapterByChainChart
```

Chain ranking table:

```text
src/pages/<adapter-route>/chains.tsx
  -> getChainsByAdapterPageData(...) or getChainsByFeesAdapterPageData(...)
  -> ChainsByAdapter
  -> ChainsByAdapterChart
```

REV chain ranking:

```text
src/pages/rev/chains.tsx
  -> getChainsByREVPageData(...)
```

Keep these flows easy to trace. Avoid generic page dispatchers that hide which builder a route calls.

## Metric Semantics

Check `docs/metrics.md` before changing route semantics, metadata flags, chart queries, public API validation, or fee/revenue wording.

Important rules:

- Always reason about `adapterType` and `dataType` together.
- `dailyVolume` is shared across DEXs, perps, DEX aggregators, and perp aggregators.
- `dailyNotionalVolume` is shared across DEX notional and options notional paths.
- `getChainMetadataKey(adapterType, dataType)` is the local source for AdapterMetrics chain metadata flag disambiguation.
- Do not move a rule into `src/metrics` unless another container or public API endpoint consumes the same invariant.

Fee/revenue has extra terminology risk:

- Chain Fees and Chain Revenue are chain-native economics.
- App Fees and App Revenue are app-on-chain aggregation.
- `/fees/chains` and `/revenue/chains` are not the same concept as `/fees/chain/[chain]` and `/revenue/chain/[chain]`.
- Chain-native fee/revenue ranking semantics are described in `src/metrics/feesRevenue.ts`.
- Public chart validation helpers for that migrated slice live in `src/metrics/routeSemantics.ts`.
- REV is chain fees plus MEV tips and has its own builder.

## Builder Responsibilities

Use the smallest builder that matches the route:

- `getAdapterByChainPageData`: selected-chain or all-chain protocol rows.
- `getChainsByAdapterPageData`: normal chain ranking rows for app aggregation and non-fee/revenue adapter metrics.
- `getChainsByFeesAdapterPageData`: chain-native Chain Fees and Chain Revenue rankings.
- `getChainsByREVPageData`: REV chain ranking.
- `getAdapterChainOverview`: adapter metrics/chart data for a chain.
- `getAdapterProtocolOverview`: adapter metrics/chart data for a protocol.
- `getChainsByAdapterChartData`: chain-breakdown chart dataset for ranking charts.

Do not substitute one ranking builder for another just because the route labels look similar.

## Fee Extras

Fees pages can include bribes and token taxes through the `fees` local storage settings.

Current behavior is split across:

- `queries.tsx`: fetches bribes/token tax data for relevant fee paths.
- `AdapterByChain.tsx`: optionally adds extras into protocol table totals and P/F or P/S calculations.
- `ChainsByAdapter.tsx`: optionally adds extras into chain ranking totals.
- `ChainChart.tsx`: optionally merges extra fee series into chart modes for supported fee charts.

Before changing this behavior, add or update focused tests. Opposite-edge cases matter: enabling bribes or token taxes should not affect unrelated adapter pages.

## Chart Notes

- `ChainChart.tsx` supports combined and breakdown views for `AdapterByChain`.
- `ChainsByAdapterChart` supports bar, dominance, treemap, and horizontal bar chart modes.
- `LINE_DIMENSIONS` in `constants.ts` marks dimensions that should render as lines instead of bars.
- Chart query params are user-facing state. Keep existing query behavior stable unless a product change explicitly asks for a migration.

## Tests

Relevant tests today:

- `__tests__/chainsPageData.test.ts`: chain ranking builders, metadata flag disambiguation, and selected builder behavior.
- `__tests__/feeRevenueSemantics.test.ts`: fee/revenue route semantics and `public/pages.json` alignment.
- `__tests__/utils.test.ts`: local helper and chart/read-model utilities.
- `__tests__/api.test.ts`: adapter API fetch behavior.
- `__tests__/metricPeriods.test.ts`: period field merging.
- `__tests__/telemetry.test.ts`: telemetry helpers.

Focused commands:

```bash
bun run test src/containers/AdapterMetrics/__tests__/chainsPageData.test.ts
bun run test src/containers/AdapterMetrics/__tests__/feeRevenueSemantics.test.ts
bun run test src/containers/AdapterMetrics/__tests__/utils.test.ts
```

For source changes, follow the repo root verification instructions.

## Change Rules

- Keep public routes, query params, API payloads, page copy, and displayed numbers stable unless explicitly requested.
- Trust upstream API payloads and aggregates.
- Prefer characterization tests before refactors.
- Keep route-to-builder flow readable from `src/pages`.
- Avoid re-export shims and barrel files. Update imports directly.
- Keep AdapterMetrics-local rules in this folder unless there is a proven cross-container invariant.
- Do not convert this folder into a generic metric framework.
