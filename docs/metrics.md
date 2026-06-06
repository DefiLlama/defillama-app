# Metrics

This document records implementation semantics for metric terminology in the app. Use it before changing metric routes, chart queries, metadata flags, public API validation, adapter data types, or route-cache validation.

`public/pages.json` is the product-facing glossary for page names, routes, descriptions, and total tracked keys. This document is the engineering companion for places where the same words can mean different upstream entities or adapter paths.

## Review Checklist

When changing metric code:

- Check the page definition in `public/pages.json`.
- Check the relevant metadata flags on chain or protocol metadata.
- Check whether the metric is chain-level economics, app-on-chain aggregation, protocol-level data, or an RWA-specific breakdown.
- Check whether a route parameter name is overloaded before adding route-cache validation. For example, a parameter named `protocol` can still contain a chain-level fee adapter ID.
- Add tests for both the intended entity type and the opposite-edge case that validation might reject.

## Fees And Revenue

Fees and revenue have two different chain concepts:

- Chain-level economics: what users pay to use the chain, and what the chain collects for itself.
- App-on-chain aggregation: what apps/protocols on that chain collect, excluding chain-native gas economics.

Do not replace chain-level fees/revenue with app aggregation unless the product definition explicitly says `App Fees` or `App Revenue`.

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
- Public API validation for this path must not require protocol metadata only. If protocol resolution misses, validate a chain fallback before rejecting the request.

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
- Chain Fees and Chain Revenue use protocol-style upstream paths with chain-level IDs, so protocol metadata can miss for valid chains. Validate the chain fallback before returning 404.
