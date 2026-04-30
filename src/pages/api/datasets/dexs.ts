import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import { slug } from '~/utils'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import { applyWeightedChange, finalizeAggregatedProtocol } from '~/utils/weightedAggregation'

const adapterType = ADAPTER_TYPES.DEXS
const metricName = 'DEX Volume'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { chains } = req.query
		const chainList = typeof chains === 'string' ? [chains] : chains || []

		if (chainList.length === 0) {
			const data = await fetchAdapterChainMetrics({
				adapterType,
				chain: 'All'
			})

			const protocols = data.protocols || []

			const sortedProtocols = protocols
				.filter((p: any) => p.total24h > 0)
				.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))

			res.status(200).json(sortedProtocols)
		} else {
			const allProtocolsMap = new Map()

			for (const chainName of chainList) {
				const chainSlug = slug(chainName)
				const chainData = metadataCache.chainMetadata[chainSlug]

				if (!chainData) {
					continue
				}

				const data = await getAdapterByChainPageData({
					adapterType,
					chain: chainData.name,
					route: 'dexs',
					metricName
				}).catch((e) => {
					console.info(`Chain page data not found ${adapterType} : chain:${chainName}`, e)
					return null
				})

				if (!data || !data.protocols) {
					continue
				}

				for (const protocol of data.protocols) {
					const key = protocol.defillamaId || protocol.name
					if (allProtocolsMap.has(key)) {
						const existing = allProtocolsMap.get(key)
						existing.total24h = (existing.total24h || 0) + (protocol.total24h || 0)
						existing.total7d = (existing.total7d || 0) + (protocol.total7d || 0)
						existing.total30d = (existing.total30d || 0) + (protocol.total30d || 0)
						applyWeightedChange(existing, 'change_7d', protocol.total7d, protocol.change_7d ?? protocol.change_7dover7d)
						existing.chains = [...new Set([...existing.chains, chainName])]
					} else {
						const entry = {
							...protocol,
							chains: [chainName],
							logo: protocol.logo,
							slug: protocol.slug
						}
						applyWeightedChange(entry, 'change_7d', protocol.total7d, protocol.change_7d ?? protocol.change_7dover7d)
						allProtocolsMap.set(key, entry)
					}
				}
			}

			const aggregatedProtocols = Array.from(allProtocolsMap.values()).map((protocol) =>
				finalizeAggregatedProtocol(protocol)
			)

			const sortedProtocols = aggregatedProtocols
				.filter((p: any) => p.total24h > 0)
				.sort((a: any, b: any) => (b.total24h || 0) - (a.total24h || 0))

			res.status(200).json(sortedProtocols)
		}
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch dexs data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/dexs', handler)
