# Metrics

This document records implementation semantics for metric terminology in the app. Use it before changing metric routes, chart queries, metadata flags, public API validation, adapter data types, or route-cache validation.

`public/pages.json` is the product-facing glossary for page names, routes, descriptions, and total tracked keys. This document is the engineering companion for places where the same words can mean different upstream entities or adapter paths.

## Scope

This is not a full catalog of every number in the app. It is for cross-route or overloaded metric semantics that can cause wrong wiring, wrong validation, or wrong entity assumptions.

Use this document for:

- Metrics where the same word means different entities, for example chain revenue versus app revenue.
- Metrics where the route shape and upstream adapter path do not name the same entity.
- Metrics where metadata flags, adapter type, and data type must be checked together.
- Metric families that are shared across multiple containers or public API endpoints.

Do not use this document as the only source for domain-local metric definitions. Some route families have their own local definition files or container docs.

Current source layout:

- `public/pages.json`: product-facing names, descriptions, route slugs, tabs, and total tracked keys.
- `src/metrics`: typed internal descriptors for migrated cross-container invariants. It is intentionally not a global registry for every metric.
- `src/containers/AdapterMetrics/README.md`: adapter-backed page ownership, data flow, and local gotchas.
- `src/containers/README.md`: route-family to container ownership map.
- RWA definition files listed below: local source of truth for RWA breakdowns.

## Review Checklist

When changing metric code:

- Check the page definition in `public/pages.json`.
- Start from the route file in `src/pages`, then follow imports to the owning container.
- Check the relevant metadata flags on chain or protocol metadata.
- Check whether the metric is chain-level economics, app-on-chain aggregation, protocol-level data, or an RWA-specific breakdown.
- Check whether adapter-backed pages require `adapterType` and `dataType` together.
- Check whether a route parameter name is overloaded before adding route-cache validation. For example, a parameter named `protocol` can still contain a chain-level fee adapter ID.
- Add tests for both the intended entity type and the opposite-edge case that validation might reject.

## Adapter-Backed Metrics

Adapter-backed metric pages live mostly under `src/containers/AdapterMetrics`.

Examples include:

- fees, revenue, holders revenue, earnings, P/F, and P/S
- DEX volume, perp volume, DEX aggregator volume, and perp aggregator volume
- options premium volume and options notional volume
- bridge aggregator volume
- open interest and normalized volume

For these pages, do not reason from `dataType` alone. Check `adapterType` and `dataType` together.

Important files:

- `src/containers/AdapterMetrics/constants.ts`: adapter types, data types, and chain metadata key disambiguation.
- `src/containers/AdapterMetrics/queries.tsx`: server/page-data builders.
- `src/containers/AdapterMetrics/api.ts`: upstream adapter metrics/chart fetchers.
- `src/containers/AdapterMetrics/README.md`: local route and change guide.
- `src/metrics/feesRevenue.ts`: cross-container fee/revenue semantic descriptors for the migrated fee/revenue slice.

Examples of ambiguous pairings:

- `dailyVolume` is used by DEXs, perps, DEX aggregators, and perp aggregators. The metadata flag depends on `adapterType`.
- `dailyNotionalVolume` is used by DEX notional volume and options notional volume. The metadata flag depends on `adapterType`.
- Fee subtypes such as bribes and token taxes gate on fee metadata but are not the same product concept as Chain Fees or App Fees. Product fee-family pages may add them to displayed totals when their toggles are enabled.

Keep route flow visible from the page file. If repeated adapter metadata rules need centralization, prefer a small AdapterMetrics-local descriptor unless another container or public API endpoint consumes the same invariant.

## Fees And Revenue

Fees and revenue have two different chain concepts:

- Chain-level economics: what users pay to use the chain, and what the chain collects for itself.
- App-on-chain aggregation: what apps/protocols on that chain collect, excluding chain-native gas economics.

Do not replace chain-level fees/revenue with app aggregation unless the product definition explicitly says `App Fees` or `App Revenue`.

### Fee Extras

Bribes and token taxes are tracked upstream as separate fees adapter data types: `dailyBribesRevenue` and `dailyTokenTaxes`.

Display behavior:

- Fee-family product surfaces that expose `bribes` and `tokentax` toggles add enabled extras into displayed totals and charts.
- Chain Fees and Chain Revenue use chain-native fee extra records from the adapter protocol chain path.
- App Fees and App Revenue use app-on-chain fee extra records from the adapter chain path.
- REV, Pro Dashboard, public raw datasets, raw dimension endpoints, and non-fee adapter pages keep bribes/token taxes separate.

Do not use app-on-chain extras to adjust Chain Fees/Revenue or chain-native extras to adjust App Fees/App Revenue.

### Chain Fees

Chain Fees are chain-level economics.

- Product route: `/fees/chains`
- Chain overview label: `Chain Fees`
- Product definition: total fees paid by users when using the chain.
- Total tracked key: `chainFees.chains`
- Metadata flag: `chainFees`
- Adapter behavior: fees adapter, protocol-style chain IDs, for example `/chart/fees/protocol/base`.

Implementation notes:

- Chain-only fee IDs such as `Base`, `Polygon`, `Sui`, and `Hyperliquid L1` may be valid for upstream fees adapter protocol endpoints even when they are not protocol metadata entries.
- Client chart requests should pass `entity=chain` for Chain Fees so the API validates the value against chain metadata and requires the `chainFees` flag.
- Public API validation for this path must not require protocol metadata only. If supporting legacy requests without `entity=chain`, validate a chain fallback and require the `chainFees` flag before fetching.

### Chain Revenue

Chain Revenue is chain-level economics.

- Product route: `/revenue/chains`
- Chain overview label: `Chain Revenue`
- Product definition: subset of fees that the chain collects for itself.
- Total tracked key: `chainRevenue.chains`
- Metadata flag: `chainRevenue`
- Adapter behavior: fees adapter, protocol-style chain IDs with `dataType=dailyRevenue`, for example `/chart/fees/protocol/base?dataType=dailyRevenue`.

Implementation notes:

- This may represent chain-retained revenue such as gas fees, bribes, token taxes, or other chain-native economics depending on the adapter methodology.
- Do not redirect Chain Revenue to app revenue aggregation.
- Client chart requests should pass `entity=chain` for Chain Revenue so the API validates the value against chain metadata and requires the `chainRevenue` flag.

### App Fees

App Fees are app-on-chain aggregation.

- Product route: `/app-fees/chains`
- Chain overview label: `App Fees`
- Product definition: sum of fees paid by users when using apps on the chain, excluding stablecoins, liquid staking apps, and gas fees.
- Total tracked key: `fees.chains`
- Data type: `dailyAppFees`
- Adapter behavior: fees adapter chain endpoint, for example `/chart/fees/chain/base?dataType=dailyAppFees`.

### App Revenue

App Revenue is app-on-chain aggregation.

- Product route: `/app-revenue/chains`
- Chain overview label: `App Revenue`
- Product definition: sum of revenue earned by apps on the chain, excluding stablecoins, liquid staking apps, and gas fees.
- Total tracked key: `revenue.chains`
- Data type: `dailyAppRevenue`
- Adapter behavior: fees adapter chain endpoint, for example `/chart/fees/chain/base?dataType=dailyAppRevenue`.

### Chain Pages Versus Chain Rankings

The chain ranking pages and dynamic chain pages are not always the same concept.

- `/fees/chains` and `/revenue/chains` rank chains by chain-level economics.
- `/app-fees/chains` and `/app-revenue/chains` rank chains by apps-on-chain aggregation.
- `/fees/chain/[chain]` and `/revenue/chain/[chain]` show protocol/app rankings on a selected chain.

Review route names and page definitions before assuming that `/fees/chain/[chain]` is the detail page for the chain-level `/fees/chains` metric.

## REV

REV is chain-level economics.

- Product route: `/rev/chains`
- Product definition: sum of chain fees and MEV tips.
- Total tracked key: `chainFees.chains`

REV is related to Chain Fees, but it is not the same display metric. Check the route implementation and page definition before reusing Chain Fees assumptions.

## TVL

TVL is not currently a single global metric implementation. The app has multiple route-specific TVL inclusion models.

Common terms:

- base TVL
- extra TVL setting keys: staking, borrowed, pool2, vesting, govtokens, doublecounted, and liquidstaking
- `dcAndLsOverlap`: not a setting key; this is overlap adjustment data for the shared portion of double counted and liquid staking TVL

Important files:

- `src/utils/tvl.ts`: shared TVL transforms used by some adjusted TVL paths.
- `src/containers/ChainsByCategory/tvl.ts`: chain/category TVL normalization and stale extra-TVL cleanup.
- `src/containers/ProtocolOverview/useFetchProtocolChartData.ts`: protocol overview TVL chart composition.
- `src/containers/ProtocolLists/utils.ts`: protocol list/table TVL toggle behavior.
- `src/containers/ProtocolRankings/`: shared protocol ranking rows and TVL display behavior.
- `src/utils/tvlOverlap.ts`: shared Oracle/Fork extra-TVL overlap helpers.
- `src/containers/Forks/tvl.ts`: fork-specific TVL/original percentage helper.
- `src/contexts/LocalStorage.tsx`: TVL setting keys.

Do not assume two routes use the same TVL model just because they share the same toggle names. Some pages start from an adjusted base TVL, while others start from raw TVL and add selected extras. Some table paths use double counted or liquid staking toggles for display/strike behavior rather than normal extra addition.

Before refactoring TVL:

- Inventory the route families involved.
- Pin current behavior with characterization tests.
- Preserve displayed numbers unless a product/API migration explicitly asks for a change.
- Prefer local container modules for route-specific behavior. Use `src/metrics` only if a stable cross-container semantic invariant is proven.

## RWA

RWA metrics have their own definitions and breakdown files:

- `public/rwa-definitions.json`
- `public/rwa-perps-definitions.json`
- `public/equities-definitions.json`
- `src/containers/RWA/definitions.ts`
- `src/containers/RWA/Perps/definitions.ts`

When changing RWA routes or charts, use those files as the local metric definitions and keep route-cache validation aligned with the route's slug semantics.

## Public API Validation

Route-cache validation is useful, but only after confirming the entity type expected by the adapter path.

Examples:

- `adapter-chain` routes should validate chain parameters through chain metadata.
- Normal protocol routes should validate protocol parameters through protocol metadata.
- Chain Fees and Chain Revenue use protocol-style upstream paths with chain-level IDs, so protocol metadata can miss for valid chains. Prefer explicit `entity=chain` from the client, then validate against chain metadata and the relevant `chainFees` or `chainRevenue` flag before fetching.
