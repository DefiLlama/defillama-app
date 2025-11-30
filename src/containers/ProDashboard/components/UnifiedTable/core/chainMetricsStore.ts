import type { ChainMetrics } from '~/server/unifiedTable/protocols'

let currentChainMetrics: Record<string, ChainMetrics> = {}

export const setChainMetrics = (metrics: Record<string, ChainMetrics> | undefined) => {
	if (metrics) {
		currentChainMetrics = { ...currentChainMetrics, ...metrics }
	}
}

export const getChainMetrics = (): Record<string, ChainMetrics> => {
	return currentChainMetrics
}

export const getChainMetricsByName = (chainName: string): ChainMetrics | null => {
	const chainSlug = chainName.toLowerCase().replace(/\s+/g, '-')
	return currentChainMetrics[chainSlug] ?? null
}
