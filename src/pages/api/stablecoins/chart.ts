import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchStablecoinChartApi } from '~/containers/Stablecoins/api'
import { getPrevStablecoinTotalFromChart } from '~/containers/Stablecoins/utils'

type StablecoinMcapSeriesPoint = [number, number]

function buildStablecoinMcapSeries(
	aggregated: Awaited<ReturnType<typeof fetchStablecoinChartApi>>['aggregated']
): StablecoinMcapSeriesPoint[] {
	return (aggregated ?? [])
		.map((point): StablecoinMcapSeriesPoint | null => {
			const timestamp = Number(point.date) * 1e3
			const mcap = getPrevStablecoinTotalFromChart([point], 0, 'totalCirculatingUSD')
			if (!Number.isFinite(timestamp) || !Number.isFinite(mcap)) return null
			return [timestamp, mcap]
		})
		.filter((point): point is StablecoinMcapSeriesPoint => point !== null)
		.sort((a, b) => a[0] - b[0])
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { chain } = req.query

	if (typeof chain !== 'string' || chain.length === 0) {
		return res.status(400).json({ error: 'chain parameter is required' })
	}

	try {
		const chainLabel = chain === 'All' ? 'all-llama-app' : chain
		const data = await fetchStablecoinChartApi(chainLabel)

		res.setHeader('Cache-Control', 'public, max-age=300')
		return res.status(200).json(buildStablecoinMcapSeries(data.aggregated))
	} catch (error) {
		console.log('Error fetching stablecoin chart:', error)
		return res.status(500).json({ error: 'Failed to fetch stablecoin chart' })
	}
}
