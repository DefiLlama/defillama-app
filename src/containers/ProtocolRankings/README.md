# ProtocolRankings

ProtocolRankings owns the shared protocol ranking table, protocol row types, custom protocol columns, and the `getProtocolsByChain` read model.

This folder is shared by several route families. It is not the single-protocol overview and it is not the recent/airdrops/token-list container.

## Used By

Common consumers:

- `/protocols`
- ChainOverview protocol rows
- DeFi watchlist protocol rows
- fork pages
- compare pages
- some special protocol-list or safe-harbor pages that need the shared protocol row model

Start from the route file in `src/pages`, then follow imports here when the page renders `ChainProtocolsTable` or calls `getProtocolsByChain`.

## Main Files

- `Table.tsx`: shared protocol ranking table and `ChainProtocolsTable` rendering.
- `queries.server.ts`: `getProtocolsByChain` read model and adapter/protocol metric enrichment.
- `types.ts`: shared protocol row, child protocol, and TVL types.
- `utils.ts`: protocol filtering and `strikeTvl` helpers.
- `customColumnsUtils.ts`: custom protocol table column definitions.
- `CustomColumnModal.tsx`: custom column UI.
- `formula.service.ts`: formula evaluation for custom columns.

## Data Flow

Shared protocol rows:

```text
route/container
  -> getProtocolsByChain(...)
  -> ProtocolRankings row model
  -> ChainProtocolsTable / Table
```

ChainOverview example:

```text
ChainOverview/queries.server.tsx
  -> getProtocolsByChain(...)
  -> ChainOverview page data
  -> ProtocolRankings/ChainProtocolsTable
```

Watchlist example:

```text
DeFiWatchlist
  -> protocol rows
  -> ProtocolRankings/ChainProtocolsTable
```

Keep this shared row model stable. Changes here can affect multiple pages that do not live under `ProtocolRankings`.

## Metric Semantics

`getProtocolsByChain` combines protocol list data with adapter metrics and metadata:

- base protocol rows come from `ProtocolLists/api`.
- fees, revenue, holders revenue, and DEX data come from AdapterMetrics fetchers.
- token prices are fetched for protocol and parent protocol market-cap derived fields.
- emissions/incentives are merged from Incentives data.
- TVL sections come from protocol `chainTvls`.

Important rules:

- `toFilterProtocol` controls whether a protocol belongs in a chain-scoped row set.
- `toStrikeTvl` controls whether TVL is visually struck based on category and TVL toggles.
- Parent/child protocol aggregation affects names, chains, TVL, and adapter metric fields.
- Fee/revenue values here are protocol/app rows on a chain, not Chain Fees or Chain Revenue ranking semantics.
- TVL display behavior here is table/read-model behavior. Do not assume it matches ChainOverview chart TVL behavior.

## TVL Notes

Be careful with:

- `default` TVL versus keyed extra TVL sections
- `doublecounted` and `liquidstaking`
- categories removed from chain TVL
- `strikeTvl` for parent and child rows
- min/max TVL filtering in consumers

Before changing TVL behavior here, check `docs/metrics.md` and add characterization tests in the consumer or this folder.

## Tests

This shared area has high blast radius and currently limited direct local tests. Add focused tests before refactoring `queries.server.ts`, `toFilterProtocol`, `toStrikeTvl`, or parent/child aggregation.

Good test targets:

- chain-scoped protocol filtering
- parent/child aggregation and chain dedupe
- `strikeTvl` behavior when liquidstaking or doublecounted settings change
- fee/revenue/dex enrichment staying distinct
- fork and oracle filters, if touched

Focused command once tests exist:

```bash
bun run test src/containers/ProtocolRankings/__tests__/<test-file>.test.ts
```

For source changes, follow the repo root verification instructions.

## Change Rules

- Treat this as shared infrastructure for protocol rows.
- Preserve public page numbers and table behavior unless explicitly requested.
- Trust upstream API payloads and aggregates.
- Add characterization tests before extracting or changing aggregation rules.
- Do not move route-specific UI state into this folder.
- Avoid re-export shims and barrel files. Update imports directly.
