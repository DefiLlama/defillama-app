# ProtocolLists

ProtocolLists owns protocol list/read-model pages that are not the single-protocol overview and not the shared protocol ranking table.

This folder is used by recent protocols, airdrops, token metric lists, and extra-TVL list pages. It also provides protocol-list API helpers used by other containers.

## Route Families

Common routes:

- `/recent`
- `/airdrops`
- `/airdrop-directory`
- `/mcaps` and `/mcaps/chain/[chain]`
- `/fdv` and related token metric list pages
- `/outstanding-fdv`
- `/token-prices` and `/token-prices/chain/[chain]`
- `/active-loans` and `/active-loans/chain/[chain]`
- `/total-staked` and `/total-staked/chain/[chain]`
- `/pool2` and `/pool2/chain/[chain]`

The `/protocol/[protocol]` entity page belongs to `ProtocolOverview`. The `/protocols` ranking table and chain overview protocol rows are shared through `ProtocolRankings`.

## Main Files

- `api.ts` and `api.types.ts`: protocol list API fetchers and DTO types.
- `queries.ts`: page-data/read-model builders for recent, airdrops, token metrics, and extra-TVL pages.
- `RecentProtocols.tsx`: recent and airdrop page container.
- `RecentProtocolsTable.tsx`: recent/airdrop table rendering.
- `ProtocolsWithTokens.tsx`: protocol token metric list UI.
- `ExtraTvlByChain.tsx`: active loans, total staked, and pool2 chain views.
- `utils.ts`: TVL toggle transforms and list filtering helpers.
- `utils.old.ts`: legacy protocol list shaping still used by some pages.
- `types.ts`, `protocol-table.types.ts`: read-model and table types.
- `airdrop-exclude.ts`, `airdrops.ts`, `data.json`: airdrop-specific local data.

## Data Flows

Recent protocols:

```text
src/pages/recent.tsx
  -> getRecentProtocols()
  -> RecentProtocols
  -> RecentProtocolsTable
```

Airdrops:

```text
src/pages/airdrops.tsx
  -> getAirdropsProtocols()
  -> RecentProtocols
  -> RecentProtocolsTable
```

Token metric lists:

```text
src/pages/mcaps*.tsx
src/pages/fdv*.tsx
src/pages/outstanding-fdv*.tsx
src/pages/token-prices*.tsx
  -> getProtocolsMarketCapsByChain(...)
  -> getProtocolsFDVsByChain(...)
  -> getProtocolsAdjustedFDVsByChain(...)
  -> getProtocolsTokenPricesByChain(...)
  -> ProtocolsWithTokens
```

Extra-TVL pages:

```text
src/pages/active-loans*.tsx
src/pages/total-staked*.tsx
src/pages/pool2*.tsx
  -> getExtraTvlByChain(...)
  -> ExtraTvlByChain
```

## Metric Semantics

ProtocolLists consumes protocol list data and reshapes it for list pages. It should not become a generic metric registry.

Important rules:

- `fetchProtocols()` is a shared protocol list source used by many containers.
- Extra TVL sections are extracted from `chainTvls` when keys match TVL setting keys.
- Recent/airdrop TVL toggle behavior is not the same as chain TVL normalization.
- `applyExtraTvl` intentionally does not apply the chain doublecounted/liquidstaking subtraction model.
- `applyProtocolTvlSettings` applies table toggles, min/max TVL filtering, child protocol behavior, and `strikeTvl` adjustments.

Read `docs/metrics.md` before changing TVL terminology or trying to share behavior with chain TVL pages.

## Tests

Local TVL/list helper coverage now exists, but the surface area is still broad. Add or update focused tests before refactoring TVL/list behavior.

Current covered helper targets:

- `applyExtraTvl`:
  - adds selected non-doublecounted/non-liquidstaking extras
  - does not apply chain doublecounted/liquidstaking subtraction
  - clamps negative values to zero
  - recalculates percent changes and market-cap-to-TVL
- `applyProtocolTvlSettings`:
  - filters by min/max after selected extras are applied
  - handles child protocols
  - clears `strikeTvl` when liquidstaking or doublecounted is enabled
    Still useful if this area is touched:

- `getExtraTvlByChain`: pin the expected extra TVL config for borrowed, staking, and pool2.

Focused command:

```bash
bun run test src/containers/ProtocolLists/__tests__/utils.test.ts
```

For source changes, follow the repo root verification instructions.

## Change Rules

- Trust upstream API payloads and aggregates.
- Preserve public routes, query params, payload shapes, page copy, and displayed numbers unless explicitly requested.
- Do not dedupe TVL behavior with ChainOverview or ChainsByCategory until characterization tests prove it is the same behavior.
- Keep protocol entity behavior in `ProtocolOverview`.
- Keep shared protocol ranking table behavior in `ProtocolRankings`.
- Avoid re-export shims and barrel files. Update imports directly.
