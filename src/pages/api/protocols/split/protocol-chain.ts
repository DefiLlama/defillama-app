import { NextApiRequest, NextApiResponse } from 'next'
import { CHAIN_ONLY_METRICS, getProtocolChainSplitData } from '~/server/protocolSplit/protocolChainService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const {
			protocol,
			metric = 'tvl',
			chains,
			limit = '5',
			filterMode,
			chainFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			chainCategories,
			protocolCategories
		} = req.query

		const metricStr = metric as string
		const rawChains = (chains as string | undefined)?.split(',').filter(Boolean) || []
		const chainsArray = rawChains.includes('All') ? [] : rawChains
		const chainCategoriesArray = (chainCategories as string | undefined)?.split(',').filter(Boolean) || []
		const protocolCategoriesArray = (protocolCategories as string | undefined)?.split(',').filter(Boolean) || []
		const resolveMode = (value?: string, fallback?: string) => {
			if (value === 'include' || value === 'exclude') return value
			if (fallback === 'include' || fallback === 'exclude') return fallback
			return 'include'
		}
		const chainMode = resolveMode(chainFilterMode as string | undefined, filterMode as string | undefined)
		const chainCategoryMode = resolveMode(
			chainCategoryFilterMode as string | undefined,
			filterMode as string | undefined
		)
		const protocolCategoryMode = resolveMode(
			protocolCategoryFilterMode as string | undefined,
			filterMode as string | undefined
		)
		const topN = Math.min(parseInt(limit as string), 20)
		const protocolStr = typeof protocol === 'string' ? protocol : undefined
		const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

		if (CHAIN_ONLY_METRICS.has(metricStr)) {
			if (!isProtocolAll) {
				res.status(400).json({
					error: `${metricStr} metric is only available when protocol=All`
				})
				return
			}
		}

		const result = await getProtocolChainSplitData({
			protocol: protocolStr,
			metric: metricStr,
			chains: chainsArray,
			topN,
			chainFilterMode: chainMode,
			chainCategoryFilterMode: chainCategoryMode,
			protocolCategoryFilterMode: protocolCategoryMode,
			chainCategories: chainCategoriesArray,
			protocolCategories: protocolCategoriesArray
		})

		res.status(200).json(result)
	} catch (error) {
		console.log('Error in protocol-chain split API:', error)
		res.status(500).json({
			error: 'Failed to fetch protocol chain data',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}
