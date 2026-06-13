import { fetchChainsByCategory } from '~/containers/Chains/api'
import { toDimensionsSlug, toDisplayName } from '~/utils/chainNormalizer'

export const CHAIN_NATIVE_BREAKDOWN_METRICS = new Set(['chain-fees', 'chain-revenue'])
export const NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS = new Set(['tvl', 'stablecoins', ...CHAIN_NATIVE_BREAKDOWN_METRICS])

export const getProtocolChainBreakdownRoute = (metric: string): string => {
	if (metric === 'tvl') return '/api/public/protocols/breakdowns/by-chain/tvl'
	if (metric === 'stablecoins') return '/api/public/stablecoins/breakdowns/by-chain'
	if (CHAIN_NATIVE_BREAKDOWN_METRICS.has(metric)) return `/api/public/chains/breakdowns/by-chain/${metric}`
	return `/api/public/adapter-metrics/breakdowns/by-chain/${metric}`
}

export const displayChainName = (slug: string): string => {
	const display = toDisplayName(slug)
	if (display !== slug) return display
	const normalized = slug.toLowerCase().replace(/_/g, '-')
	return normalized
		.split('-')
		.map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
		.join(' ')
}

export async function resolveAllowedChainNamesFromCategories(categories: string[]): Promise<Set<string>> {
	if (!categories || categories.length === 0) return new Set()
	const responses = await Promise.allSettled(categories.map((category) => fetchChainsByCategory(category)))
	const names = new Set<string>()
	for (const response of responses) {
		if (response.status !== 'fulfilled') continue
		const chains: string[] = Array.isArray(response.value?.chainsUnique) ? response.value.chainsUnique : []
		for (const chain of chains) names.add(chain)
	}
	return names
}

export async function resolveAllowedChainSlugsFromCategories(categories: string[]): Promise<Set<string>> {
	const names = await resolveAllowedChainNamesFromCategories(categories)
	const slugs = new Set<string>()
	for (const name of names) {
		slugs.add(toDimensionsSlug(name))
	}
	return slugs
}
