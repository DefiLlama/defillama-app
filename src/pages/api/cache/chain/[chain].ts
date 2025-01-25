import { NextApiRequest, NextApiResponse } from 'next'
import { fetchChain } from '~/containers/ComparePage/chainFetcher'
import { setObjectCache } from '~/utils/cache-client'
import { getObjectCache } from '~/utils/cache-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { chain } = req.query
	const cacheKey = `object-chain-${chain}`

	const cachedData = await getObjectCache(cacheKey)
	if (cachedData) {
		return res.json(cachedData)
	}

	const chainData = await fetchChain({ chain: chain as string })
	const response = { chain: chainData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}
