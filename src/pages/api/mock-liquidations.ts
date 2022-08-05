// Next API route for handling liquidation returns
import { NextApiRequest, NextApiResponse } from 'next'
import { getResponse } from '../../utils/liquidations'

export default async function liquidationsHandler(req: NextApiRequest, res: NextApiResponse) {
	const { symbol, aggregateBy, filters } = req.query
	console.log('[mock-liquidations] received these filters but filters are currently handled on the frontend', filters)
	// if symbol/aggregateBy is an array, get the first one
	// will make more robust when we have server side
	const _symbol = Array.isArray(symbol) ? symbol[0] : symbol
	const _aggregateBy = Array.isArray(aggregateBy) ? aggregateBy[0] : aggregateBy
	const __aggregateBy = (['chain', 'protocol'].includes(_aggregateBy) ? _aggregateBy : 'protocol') as
		| 'chain'
		| 'protocol'
	const chartData = await getResponse(_symbol, __aggregateBy)
	res.status(200).json(chartData)
}
