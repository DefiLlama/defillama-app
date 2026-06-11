# ProtocolOverview

ProtocolOverview owns single-protocol entity pages: the main protocol overview, protocol chart page, CEX protocol pages, and protocol subroutes that reuse the same layout and metric flags.

Start from the route file in `src/pages`, then follow imports here. This container is for one protocol entity at a time. Protocol lists and shared ranking tables belong in `ProtocolLists` and `ProtocolRankings`.

## Route Families

Common routes:

- `/protocol/[protocol]`
- `/chart/protocol/[protocol]`
- `/cex/[cex]` and CEX subroutes that reuse the protocol layout
- `/protocol/tvl/[protocol]`
- `/protocol/treasury/[protocol]`
- `/protocol/yields/[protocol]`
- `/protocol/perps/[protocol]`
- `/protocol/forks/[protocol]`
- `/protocol/governance/[protocol]`
- `/protocol/stablecoins/[protocol]`
- `/protocol/active-loans/[protocol]`
- `/protocol/token-rights/[protocol]`

Category and protocol listing routes are not owned here. See `ProtocolTaxonomy`, `ProtocolLists`, and `ProtocolRankings`.

## Main Files

- `index.tsx`: main protocol overview page composition.
- `Layout.tsx`: shared protocol subroute layout and SEO frame.
- `queries.tsx`: server/page-data builder for the main overview.
- `api.ts`: protocol overview, TVL chart, token breakdown, expenses, and related fetchers.
- `types.ts` and `api.types.ts`: UI/read-model types and upstream DTO types.
- `constants.tsx`: protocol chart labels and toggle keys.
- `defaultCharts.ts`: available/default chart selection.
- `chartDescriptors.ts`: protocol-level adapter chart request descriptors.
- `useFetchProtocolChartData.ts`: main protocol chart data hook and chart composition.
- `useProtocolBreakdownCharts.ts`: token/chain breakdown chart fetching for subroutes.
- `formatAdapterData.ts`: adapter metric normalization for protocol overview cards.
- `IncomeStatement.tsx`, `KeyMetrics.tsx`, `AdditionalInfo.tsx`: major overview sections.

## Data Flow

Main overview:

```text
src/pages/protocol/[protocol].tsx
  -> getProtocolOverviewPageData(...)
  -> ProtocolOverview
  -> ProtocolChartPanel / KeyMetrics / IncomeStatement / AdditionalInfo
```

Protocol chart page:

```text
src/pages/chart/protocol/[protocol].tsx
  -> ProtocolOverview data
  -> Chart / useFetchProtocolChartData
```

Protocol subroutes:

```text
src/pages/protocol/<section>/[protocol].tsx
  -> fetchProtocolOverviewMetrics(...)
  -> getProtocolMetricFlags(...)
  -> ProtocolOverviewLayout
  -> section-specific UI
```

Keep this flow visible. Do not move protocol list/table behavior into this folder unless the route is about a single protocol entity.

## Metric Semantics

ProtocolOverview metrics are protocol-level unless a subroute explicitly says otherwise.

Important rules:

- `getProtocolMetricFlags` maps protocol metadata to chart/section availability.
- Protocol fees/revenue charts use protocol adapter endpoints, not chain-native fee/revenue ranking semantics.
- `chartDescriptors.ts` owns protocol-level adapter chart request descriptors.
- Chain Fees, Chain Revenue, App Fees, App Revenue, and REV semantics live in `src/metrics` only because they cross ChainOverview, AdapterMetrics, and public chart validation. Do not move ProtocolOverview descriptors there unless another container or API endpoint needs the same invariant.
- TVL chart composition in `useFetchProtocolChartData.ts` is local and has timestamp alignment and denomination behavior. Add characterization tests before extracting it.

## TVL Notes

ProtocolOverview TVL chart behavior is not the same as every chain or protocol list TVL surface.

Current behavior to preserve before refactoring:

- TVL chart data may be prefetched in `initialMultiSeriesChartData`.
- Missing prefetched base TVL can be fetched through `useFetchProtocolTVLChart`.
- Enabled extra TVL series are fetched only when the protocol has the current TVL key and the relevant chart/toggle state needs it.
- Latest base TVL and extra TVL timestamps can be aligned when they are close.
- Denominated charts drop points when the selected denomination price is missing for the retained timestamp.

`useFinalTVL` reads the `tvl_fees` local storage namespace. That namespace uses the same TVL setting keys as `tvl` and additionally carries fee options such as `bribes` and `tokentax` for adapter-metric totals. `bribes` and `tokentax` should expose fee controls without changing TVL aggregation. Mixed TVL/fee filter labels should use shared metric-filter wording rather than saying only `Include in TVL`.

Do not model chain overlap adjustment as a ProtocolOverview setting. `dcAndLsOverlap` is chain TVL overlap data, not a toggle key, and ProtocolOverview summary tests should not fabricate `*-doublecounted`, `*-liquidstaking`, or `*-dcAndLsOverlap` chain entries unless the upstream protocol page payload changes.

Prefer a local `ProtocolOverview` helper if this code needs extraction. Do not start with a global TVL registry.

## Chart Notes

- `useFetchProtocolChartData.ts` orchestrates TVL, adapter metrics, token liquidity, treasury, inflows, governance, activity, and other chart families.
- `chartSeries.utils.ts` normalizes timestamp units for chart rendering.
- `chartYAxis.ts` owns protocol chart y-axis grouping behavior.
- `usePrefetchedProtocolChartQuery.ts` lets prefetched chart data avoid duplicate client fetches.
- Chart request URL changes are behavior changes. Add tests around the exact URL or descriptor before changing them.

## Tests

Relevant tests today:

- `__tests__/queries.test.ts`
- `__tests__/formatAdapterData.test.ts`
- `__tests__/helpers.test.ts`
- `__tests__/category.test.ts`
- `__tests__/KeyMetrics.test.tsx`
- `__tests__/seo.test.tsx`

Focused commands:

```bash
bun run test src/containers/ProtocolOverview/__tests__/queries.test.ts
bun run test src/containers/ProtocolOverview/__tests__/formatAdapterData.test.ts src/containers/ProtocolOverview/__tests__/helpers.test.ts
bun run test src/containers/ProtocolOverview/__tests__/KeyMetrics.test.tsx src/containers/ProtocolOverview/__tests__/seo.test.tsx
```

For source changes, follow the repo root verification instructions.

## Change Rules

- Trust upstream API payloads and aggregates.
- Preserve public routes, query params, payload shapes, page copy, and displayed numbers unless explicitly requested.
- Keep protocol entity behavior here; keep protocol list/ranking behavior in `ProtocolLists` or `ProtocolRankings`.
- Prefer local pure helpers and characterization tests before refactoring `useFetchProtocolChartData.ts`.
- Avoid re-export shims and barrel files. Update imports directly.
