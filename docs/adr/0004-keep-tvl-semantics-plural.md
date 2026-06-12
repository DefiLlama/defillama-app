# ADR 0004: Keep TVL Semantics Plural

## Status

Accepted

## Context

TVL appears across protocol overview charts, protocol rankings, protocol lists, chain/category views, forks, oracles, and shared TVL utilities. These surfaces share some names, but they do not share one behavior model.

Protocol overview chart TVL composes historical chart series. It handles base TVL, selected extra-TVL charts, denomination conversion, grouping, and timestamp alignment so stale extra-TVL series do not shift the latest displayed point.

Protocol rankings row TVL composes current table rows. It handles parent/child aggregation, `excludeParent` subtraction, previous-TVL null propagation, strike-through display, and extra-TVL settings used for table filtering/display rather than chart composition.

## Decision

Do not create a global TVL module for these route families.

Keep route-specific TVL behavior local to the owning container unless a smaller invariant is proven identical across consumers. Shared helpers remain appropriate for narrow, stable concepts such as TVL setting key sets, overlap keys, and reusable low-level transforms.

## Consequences

Future TVL refactors must start from the route family and pin current displayed numbers before moving logic.

A missing global TVL module is intentional. Adding one would require a product/API migration plan because a single interface would need route-specific knobs for chart history, ranking rows, parent aggregation, table display, and denomination behavior.
