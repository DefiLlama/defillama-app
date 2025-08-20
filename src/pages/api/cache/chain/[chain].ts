import { NextApiRequest, NextApiResponse } from 'next'
import { fetchChain } from '~/containers/CompareChains/chainFetcher'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}

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
