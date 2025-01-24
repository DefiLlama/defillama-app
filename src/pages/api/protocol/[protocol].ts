import { NextApiRequest, NextApiResponse } from 'next'
import { getProtocol } from '~/api/categories/protocols'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { apiCache } from '~/utils/cache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { protocol } = req.query
	const cacheKey = `protocol-${protocol}`

	const cachedData = apiCache.get(cacheKey)
	if (cachedData) {
		return res.json(cachedData)
	}

	const protocolRes = await getProtocol(protocol as string)
	const protocolData = await getProtocolData(protocol as string, protocolRes, true)
	const response = { protocol: protocolData }

	apiCache.set(cacheKey, response)
	return res.json(response)
}
