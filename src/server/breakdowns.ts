import { fetchChainsByCategory } from '~/containers/Chains/api'
import { toDimensionsSlug, toDisplayName } from '~/utils/chainNormalizer'
export {
	CHAIN_NATIVE_BREAKDOWN_METRICS,
	getProtocolChainBreakdownRoute,
	NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS,
	PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS,
	STREAM_PROTOCOL_SERIES_SKIP_METRICS
} from '~/utils/breakdownMetrics'

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
