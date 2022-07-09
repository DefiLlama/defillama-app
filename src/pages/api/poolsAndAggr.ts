import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
	try {
		const response = await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API])
		const data = response && { pools: response[0]?.data ?? [], aggregations: response[1]?.data ?? [] }
		return JSON.stringify(data)
	} catch (err) {
		return res.status(500).json({ error: 'failed to load data' })
	}
}
