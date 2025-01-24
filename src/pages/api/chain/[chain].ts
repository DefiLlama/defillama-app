import { NextApiRequest, NextApiResponse } from 'next'
import { fetchChain } from '~/containers/ComparePage/chainFetcher'
import { apiCache } from '~/utils/cache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { chain } = req.query
	const cacheKey = `chain-${chain}`

	const cachedData = apiCache.get(cacheKey)
	if (cachedData) {
		return res.json(cachedData)
	}

	const chainData = await fetchChain({ chain: chain as string })
	const response = { chain: chainData }

	apiCache.set(cacheKey, response)
	return res.json(response)
}
