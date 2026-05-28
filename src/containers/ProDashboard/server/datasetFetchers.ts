import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import type { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { mergeMetricPeriods } from '~/containers/DimensionAdapters/metricPeriods'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { slug } from '~/utils'

interface DimensionDatasetOptions {
	adapterType: `${ADAPTER_TYPES}`
	route: string
	metricName: string
	chains?: string[]
	hasOpenInterestByChain?: boolean
	withChainBreakdown?: boolean
}

export async function fetchDimensionDataset({
	adapterType,
	route,
	metricName,
	chains,
	hasOpenInterestByChain,
	withChainBreakdown
}: DimensionDatasetOptions): Promise<any[]> {
	const chainList = chains ?? []
	const allChains = chainList.length === 0 || chainList.includes('All')

	if (allChains) {
		const data = await fetchAdapterChainMetrics({ adapterType, chain: 'All' })
		return (data.protocols || [])
			.filter((p: any) => p.total24h > 0)
			.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const allProtocolsMap = new Map<string, any>()

	for (const chainName of chainList) {
		const chainSlug = slug(chainName)
		const chainData = metadataCache.chainMetadata[chainSlug]
		if (!chainData) continue

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: chainData.name,
			route,
			metricName,
			...(hasOpenInterestByChain ? { hasOpenInterest: chainData.openInterest } : {})
		}).catch((e) => {
			console.info(`Chain page data not found ${adapterType} : chain:${chainName}`, e)
			return null
		})

		if (!data?.protocols) continue

		for (const protocol of data.protocols) {
			const key = protocol.defillamaId || protocol.name
			if (allProtocolsMap.has(key)) {
				const existing = allProtocolsMap.get(key)
				mergeMetricPeriods(existing, protocol)
				existing.chains = Array.from(new Set([...(existing.chains || []), chainName]))
				if (withChainBreakdown) {
					const normalizedChainKey = chainName.trim().toLowerCase()
					existing.chainBreakdown = existing.chainBreakdown || {}
					existing.chainBreakdown[normalizedChainKey] = {
						...protocol,
						change_7d: protocol.change_7d ?? protocol.change_7dover7d,
						chain: chainName
					}
				}
			} else {
				const entry: any = {
					...protocol,
					chains: [chainName],
					logo: protocol.logo,
					slug: protocol.slug
				}
				if (withChainBreakdown) {
					const normalizedChainKey = chainName.trim().toLowerCase()
					entry.chainBreakdown = {
						[normalizedChainKey]: {
							...protocol,
							change_7d: protocol.change_7d ?? protocol.change_7dover7d,
							chain: chainName
						}
					}
				}
				allProtocolsMap.set(key, entry)
			}
		}
	}

	return Array.from(allProtocolsMap.values())
		.filter((p: any) => p.total24h > 0)
		.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))
}
