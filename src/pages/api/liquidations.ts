// Next API route for handling liquidation returns
import { NextApiRequest, NextApiResponse } from 'next'
import { ChartData, getLatestChartData } from '../../utils/liquidations'

// prolly should move this into an aws lambda after all...
export default async function liquidationsHandler(
	req: NextApiRequest,
	res: NextApiResponse<ChartData | { error: string }>
) {
	const { symbol } = req.query as LiquidationsApiQuery
	if (!symbol) {
		res.status(400).json({ error: 'Missing symbol' })
		return
	}
	if (Object.keys(req.query).length > 1) {
		res.status(400).json({ error: 'Too many query params' })
		return
	}
	if (typeof symbol !== 'string') {
		res.status(400).json({ error: 'Only one symbol supported' })
		return
	}
	try {
		const chartData = await getLatestChartData(symbol)
		// cache for 10min
		res
			// .setHeader('Cache-Control', 'max-age=600, s-maxage=600, stale-while-revalidate')
			.status(200)
			.json(chartData)
	} catch (err) {
		res.status(500).json({ error: 'Server error' })
		console.error(err)
	}
}

export type LiquidationsApiQuery = {
	symbol: string
}
