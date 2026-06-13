export const CHAIN_NATIVE_BREAKDOWN_METRICS = new Set(['chain-fees', 'chain-revenue'])

export const PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS = new Set(['stablecoins', ...CHAIN_NATIVE_BREAKDOWN_METRICS])

export const NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS = new Set(['tvl', ...PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS])

// The dashboard stream has historically skipped protocol-series prefetch for
// TVL and true chain-only metrics. Keep that behavior distinct from route
// ownership and protocol-support rules.
export const STREAM_PROTOCOL_SERIES_SKIP_METRICS = new Set(['tvl', ...PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS])

export const getProtocolChainBreakdownRoute = (metric: string): string => {
	if (metric === 'tvl') return '/api/public/protocols/breakdowns/by-chain/tvl'
	if (metric === 'stablecoins') return '/api/public/stablecoins/breakdowns/by-chain'
	if (CHAIN_NATIVE_BREAKDOWN_METRICS.has(metric)) return `/api/public/chains/breakdowns/by-chain/${metric}`
	return `/api/public/adapter-metrics/breakdowns/by-chain/${metric}`
}
