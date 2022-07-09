import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
	try {
		const data = await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API])

		const response = {
			data: data
				? {
						pools: data[0]?.data?.map((pool) => ({ ...pool, audit_links: [] })) ?? [],
						aggregations: data[1]?.data ?? []
				  }
				: null
		}

		res.status(200).json({ response })
	} catch (err) {
		res.status(500).json({ error: 'failed to load data' })
	}
}
