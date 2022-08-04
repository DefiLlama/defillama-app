// Next API route for handling liquidation returns
import { NextApiRequest, NextApiResponse } from 'next'
import { getDropdownOptions } from '../../utils/liquidations'

export default async function liquidationsOptionsHandler(req: NextApiRequest, res: NextApiResponse) {
	const { aggregateBy } = req.query
	// if symbol/aggregateBy is an array, get the first one
	// will make more robust when we have server side
	const _aggregateBy = Array.isArray(aggregateBy) ? aggregateBy[0] : aggregateBy
	const __aggregateBy = (['chain', 'protocol'].includes(_aggregateBy) ? _aggregateBy : 'protocol') as
		| 'chain'
		| 'protocol'
	const dropdownOptions = await getDropdownOptions(__aggregateBy)
	res.status(200).json(dropdownOptions)
}
