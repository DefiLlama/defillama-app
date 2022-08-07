// Next API route for handling liquidation returns
import { NextApiRequest, NextApiResponse } from 'next'
import { ChartData, getLatestChartData } from '../../utils/liquidations'

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
	const chartData = await getLatestChartData(symbol)
	res.status(200).json(chartData)
}

export type LiquidationsApiQuery = {
	symbol: string
}
