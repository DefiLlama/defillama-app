# ChainOverview

ChainOverview owns chain entity overview pages: the home/all-chains overview, individual chain overview, and chain chart page.

Start from the route file in `src/pages`, then follow imports here. This container is for a chain entity view. Shared protocol ranking rows are rendered through `ProtocolRankings`.

## Route Families

Common routes:

- `/`
- `/chain/[chain]`
- `/chart/chain/[chain]`

Related chain ranking pages such as `/fees/chains`, `/app-fees/chains`, `/dexs/chains`, and `/chains` are not owned here. See `AdapterMetrics` and `ChainsByCategory`.

## Main Files

- `index.tsx`: main chain overview page composition.
- `queries.server.tsx`: server/page-data builder for chain overview data.
- `useFetchChainChartData.tsx`: client chart query hook for chain overview charts.
- `constants.tsx`: chain chart labels, chart keys, and chart config.
- `Chart.tsx` and `ChainChartPanel.tsx`: chain chart UI.
- `Stats.tsx`, `KeyMetrics.tsx`, `SmolStats.tsx`: summary metrics and cards.
- `FeesGeneratedChart.tsx`: fee/revenue chart presentation.
- `homepageUnlocks.server.ts`: unlock summary data used by the home/all chains view.
- `types.ts`: chain overview read-model types.
- `utils.tsx`: formatting and chain overview helpers.

## Data Flow

Home/all-chains and chain overview:

```text
src/pages/index.tsx
src/pages/chain/[chain].tsx
  -> getChainOverviewData(...)
  -> ChainOverview
  -> Stats / KeyMetrics / ChainProtocolsTable / ChainChartPanel
```

Chain chart page:

```text
src/pages/chart/chain/[chain].tsx
  -> getChainOverviewData(...)
  -> Chart / useFetchChainChartData
```

Protocol rows on chain pages:

```text
getChainOverviewData(...)
  -> getProtocolsByChain(...)
  -> ProtocolRankings/ChainProtocolsTable
```

Keep chain overview orchestration here, but keep shared protocol table/read-model behavior in `ProtocolRankings`.

## Metric Semantics

Read `docs/metrics.md` before changing chart labels, chart queries, metadata flags, or fee/revenue behavior.

Important rules:

- Chain Fees and Chain Revenue are chain-native economics.
- App Fees and App Revenue are app-on-chain aggregation.
- These four labels use descriptors from `src/metrics/feesRevenue.ts`.
- Chain-native fee/revenue chart requests intentionally use the adapter protocol chart path with `entity=chain`.
- Do not replace Chain Revenue with app revenue aggregation or vice versa.
- REV is not currently a ChainOverview chart metric.
- Bribes and token taxes are optional display add-ons for Chain Fees, Chain Revenue, App Fees, and App Revenue when the corresponding filter toggles are exposed. Chain-native labels use adapter protocol chain extras; app labels use adapter chain extras. `totalREV24h` is not adjusted by those toggles.

## TVL Notes

ChainOverview receives base and extra TVL chart data from the chain chart API and renders chart toggles through chain chart UI.

Be careful with:

- TVL chart keys such as `tvl`, `staking`, `borrowed`, `pool2`, `vesting`, `doublecounted`, and `liquidstaking`
- `dcAndLsOverlap` is not a toggle key. It is overlap adjustment data used when both `doublecounted` and `liquidstaking` are included so the shared TVL is not added twice.
- local storage namespace differences such as `tvl` and `tvl_chains`
- chain chart behavior versus protocol table TVL behavior

Do not move TVL behavior into `src/metrics` without first inventorying the route families and adding characterization tests.

## Bridged TVL Notes

ChainOverview can show a Bridged TVL key metric card from current `/chain-assets/chains` totals. The historical Bridged TVL chart is different data: it depends on the precomputed backend `/chain-assets/chart/:chain-slug` route and is exposed from chain metadata `chainAssets`, even when the current totals fetch is missing or failed.

The chart semantics are one millisecond timestamp point per day with `total`, plus `ownTokens` when `govtokens` is enabled. Non-USD denomination conversion uses the same millisecond timestamp for the combined value.

## Tests

Relevant tests today:

- `__tests__/queries.server.test.ts`
- `__tests__/tvlChart.test.ts`
- `__tests__/chartDataTransforms.test.ts`
- `__tests__/chartMetricSemantics.test.tsx`
- `__tests__/chain-chart-page.test.tsx`
- `__tests__/KeyMetrics.test.tsx`
- `__tests__/homepageUnlocks.server.test.ts`

Focused commands:

```bash
bun run test src/containers/ChainOverview/__tests__/queries.server.test.ts
bun run test src/containers/ChainOverview/__tests__/tvlChart.test.ts src/containers/ChainOverview/__tests__/chartDataTransforms.test.ts
bun run test src/containers/ChainOverview/__tests__/chartMetricSemantics.test.tsx
bun run test src/containers/ChainOverview/__tests__/chain-chart-page.test.tsx src/containers/ChainOverview/__tests__/KeyMetrics.test.tsx
```

For source changes, follow the repo root verification instructions.

## Change Rules

- Trust upstream API payloads and aggregates.
- Preserve public routes, query params, payload shapes, page copy, and displayed numbers unless explicitly requested.
- Keep route-to-builder flow readable from `src/pages`.
- Add opposite-edge tests for fee/revenue changes: chain-native economics and app aggregation must not swap.
- Avoid re-export shims and barrel files. Update imports directly.
