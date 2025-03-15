import { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolDataV2 } from '~/api/categories/protocols/getProtocolData'
import { getProtocol } from '~/api/categories/protocols'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { protocol } = req.query
	const cacheKey = `object-protocol-${protocol}`

	const cachedData = await getObjectCache(cacheKey)
	if (cachedData) {
		console.log('Cache hit')
		return res.json(cachedData)
	}

	const protocolRes = await getProtocol(protocol as string)
	const protocolData = await getProtocolDataV2(protocol as string, protocolRes, true)
	const response = { protocol: protocolData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}
