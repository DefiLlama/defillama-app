// Next API route for handling liquidation returns
import { NextApiRequest, NextApiResponse } from 'next'
import { ChartData, getResponse } from '../../utils/liquidations'

export default async function liquidationsHandler(req: NextApiRequest, res: NextApiResponse<ChartData>) {
	const { symbol } = req.query as LiquidationsApiQuery
	// if symbol/aggregateBy is an array (by accident), get the first one
	const _symbol: string = Array.isArray(symbol) ? symbol[0] : symbol
	const chartData = await getResponse(_symbol)
	res.status(200).json(chartData)
}

export type LiquidationsApiQuery = {
	symbol: string
}
