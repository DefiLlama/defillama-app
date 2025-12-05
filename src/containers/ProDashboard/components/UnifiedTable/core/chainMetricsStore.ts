import type { ChainMetrics } from '~/server/unifiedTable/protocols'

let currentChainMetrics: Record<string, ChainMetrics> = {}

const CHAIN_SLUG_ALIASES: Record<string, string> = {
	optimism: 'op-mainnet',
	binance: 'bsc',
	xdai: 'gnosis',
	cosmos: 'cosmoshub',
	pulse: 'pulsechain',
	hyperliquid: 'hyperliquid-l1',
	zksync: 'zksync-era'
}

export const setChainMetrics = (metrics: Record<string, ChainMetrics> | undefined) => {
	if (metrics) {
		currentChainMetrics = { ...currentChainMetrics, ...metrics }
	}
}

export const getChainMetrics = (): Record<string, ChainMetrics> => {
	return currentChainMetrics
}

export const getChainMetricsByName = (chainName: string): ChainMetrics | null => {
	const slug = chainName.toLowerCase().replace(/\s+/g, '-')
	const normalizedSlug = CHAIN_SLUG_ALIASES[slug] ?? slug
	return currentChainMetrics[normalizedSlug] ?? null
}
