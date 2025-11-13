import type { NextApiRequest, NextApiResponse } from 'next'
import {
	getDexVolumeByChain,
	getFeesAndRevenueProtocolsByChain,
	getOpenInterestByChain,
	getPerpsVolumeByChain
} from '~/api/categories/adaptors'
import { slug } from '~/utils'

type MetricKey = 'volume' | 'fees' | 'perps' | 'open-interest'

const MAX_CHAIN_REQUESTS = 20

const METRIC_FETCHERS: Record<MetricKey, (chain: string) => Promise<any[]>> = {
	volume: async (chain: string) => {
		const normalized = slug(chain)
		const data = await getDexVolumeByChain({
			chain: normalized,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		})
		return data?.protocols ?? []
	},
	fees: async (chain: string) => {
		const normalized = slug(chain)
		const data = await getFeesAndRevenueProtocolsByChain({ chain: normalized }).catch(() => null)
		return Array.isArray(data) ? data : []
	},
	perps: async (chain: string) => {
		const normalized = slug(chain)
		const data = await getPerpsVolumeByChain({
			chain: normalized,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		})
		return data?.protocols ?? []
	},
	'open-interest': async (chain: string) => {
		const normalized = slug(chain)
		const data = await getOpenInterestByChain({ chain: normalized })
		return data?.protocols ?? []
	}
}

const sanitizeChains = (input: string | string[] | undefined): string[] => {
	if (!input) return []
	const arr = Array.isArray(input) ? input : [input]
	const result: string[] = []
	const seen = new Set<string>()
	for (const value of arr) {
		if (typeof value !== 'string') continue
		const trimmed = value.trim()
		if (!trimmed || trimmed.toLowerCase() === 'all' || trimmed.toLowerCase() === 'all chains') continue
		const normalized = trimmed.toLowerCase()
		if (seen.has(normalized)) continue
		seen.add(normalized)
		result.push(trimmed)
		if (result.length >= MAX_CHAIN_REQUESTS) {
			break
		}
	}
	return result
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const metricParam = req.query.metric
	if (typeof metricParam !== 'string') {
		return res.status(400).json({ error: 'Metric parameter is required.' })
	}

	const metric = metricParam as MetricKey
	if (!(metric in METRIC_FETCHERS)) {
		return res.status(400).json({ error: `Unsupported metric "${metric}".` })
	}

	const chains = sanitizeChains(req.query.chains)
	if (!chains.length) {
		return res.status(400).json({ error: 'Provide at least one valid chain.' })
	}

	try {
		const fetcher = METRIC_FETCHERS[metric]
		const results = await Promise.all(
			chains.map(async (chain) => {
				try {
					const protocols = await fetcher(chain)
					return {
						chain,
						normalized: chain.trim().toLowerCase(),
						protocols
					}
				} catch (error) {
					console.error(`Failed to fetch ${metric} data for chain ${chain}:`, error)
					return {
						chain,
						normalized: chain.trim().toLowerCase(),
						error: true,
						protocols: []
					}
				}
			})
		)

		res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120')
		return res.status(200).json({
			metric,
			chains: results
		})
	} catch (error) {
		console.error('chain-metrics handler error:', error)
		return res.status(500).json({ error: 'Failed to fetch chain metrics.' })
	}
}
