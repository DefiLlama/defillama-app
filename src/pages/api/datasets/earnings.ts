import { NextApiRequest, NextApiResponse } from 'next'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData, getAdapterChainOverview } from '~/containers/DimensionAdapters/queries'
import { slug } from '~/utils'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_EARNINGS

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { chains } = req.query
		const chainList = typeof chains === 'string' ? [chains] : chains || []

		if (chainList.length === 0 || chainList.includes('All')) {
			// No chains selected, return all protocols
			const data = await getAdapterChainOverview({
				adapterType,
				dataType,
				chain: 'All',
				excludeTotalDataChart: true
			})

			const protocols = data.protocols || []

			// Sort by total24h earnings descending
			const sortedProtocols = protocols
				.filter((p: any) => p.total24h > 0)
				.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))

			res.status(200).json(sortedProtocols)
		} else {
			// Fetch data for specific chains and aggregate
			const allProtocolsMap = new Map<string, any>()

			for (const chainName of chainList) {
				const chainSlug = slug(chainName)
				const chainData = metadataCache.chainMetadata[chainSlug]

				if (!chainData?.fees) {
					continue
				}

				const data = await getAdapterByChainPageData({
					adapterType,
					dataType,
					chain: chainData.name,
					route: 'earnings'
				}).catch((e) => {
					console.info(`Chain page data not found ${adapterType}:${dataType} : chain:${chainSlug}`, e)
					return null
				})

				if (!data || !data.protocols) {
					continue
				}

				// Aggregate protocols across chains
				data.protocols.forEach((protocol: any) => {
					const key = protocol.defillamaId || protocol.name
					const normalizedChainKey = chainName.trim().toLowerCase()

					if (allProtocolsMap.has(key)) {
						const existing = allProtocolsMap.get(key)
						existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
						existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
						existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
						existing.total1y = (existing.total1y || 0) + (protocol.total1y || 0)
						existing.chains = Array.from(new Set([...(existing.chains || []), chainName]))
						existing.chainBreakdown = existing.chainBreakdown || {}
						existing.chainBreakdown[normalizedChainKey] = {
							...protocol,
							chain: chainName
						}
					} else {
						allProtocolsMap.set(key, {
							...protocol,
							chains: [chainName],
							chainBreakdown: {
								[normalizedChainKey]: {
									...protocol,
									chain: chainName
								}
							},
							logo: protocol.logo,
							slug: protocol.slug
						})
					}
				})
			}

			const aggregatedProtocols = Array.from(allProtocolsMap.values())

			// Sort by total24h earnings descending
			const sortedProtocols = aggregatedProtocols
				.filter((p: any) => p.total24h > 0)
				.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))

			res.status(200).json(sortedProtocols)
		}
	} catch (error) {
		console.log('Error fetching earnings data:', error)
		res.status(500).json({ error: 'Failed to fetch earnings data' })
	}
}
