import { NextApiRequest, NextApiResponse } from 'next'
import { DIMENSIONS_METRIC_CONFIG, getDimensionsSplitData } from '~/server/protocolSplit/dimensionsSplit'
import { getTvlSplitData } from '~/server/protocolSplit/tvlSplit'

async function handleTVLRequest(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, limit = '10', categories, groupByParent, filterMode } = req.query

		let chainsArray = chains ? (chains as string).split(',').filter(Boolean) : []
		if (chainsArray.length === 0 || chainsArray.some((c) => c.toLowerCase() === 'all')) {
			chainsArray = []
		}
		const categoriesArray = categories ? (categories as string).split(',').filter(Boolean) : []
		const topN = Math.min(parseInt(limit as string), 20)
		const shouldGroupByParent = groupByParent === 'true'
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'

		const result = await getTvlSplitData(chainsArray, categoriesArray, topN, shouldGroupByParent, fm)

		res.status(200).json(result)
	} catch (error) {
		console.log('Error handling TVL request:', error)
		res.status(500).json({
			error: 'Failed to fetch TVL data',
			message: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { dataType, chains, limit = '10', categories, groupByParent, filterMode } = req.query
		const metric = dataType as string

		if (metric === 'tvl') {
			return handleTVLRequest(req, res)
		}

		const topN = Math.min(parseInt(limit as string), 20)
		const chainsArray = chains ? (chains as string).split(',').filter(Boolean) : ['all']
		const categoriesArray = categories
			? (categories as string)
					.split(',')
					.filter(Boolean)
					.map((cat) => cat.toLowerCase())
			: []
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'
		const shouldGroupByParent = groupByParent === 'true'

		const config = DIMENSIONS_METRIC_CONFIG[metric]
		if (!config) {
			return res.status(400).json({ error: `Unsupported metric: ${metric}` })
		}

		const result = await getDimensionsSplitData({
			metric,
			chains: chainsArray,
			categories: categoriesArray,
			topN,
			groupByParent: shouldGroupByParent,
			filterMode: fm
		})

		res.status(200).json(result)
	} catch (error) {
		const metric = req.query.dataType as string
		console.log(`Error in ${metric} split API:`, error)
		res.status(500).json({
			error: `Failed to fetch protocol ${metric} data`,
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}
