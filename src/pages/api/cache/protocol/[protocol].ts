import { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { getProtocol } from '~/api/categories/protocols'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import { PROTOCOLS_METADATA } from '~/constants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { protocol } = req.query
	const cacheKey = `object-protocol-${protocol}`

	const cachedData = await getObjectCache(cacheKey)
	if (cachedData) {
		console.log('Cache hit')
		return res.json(cachedData)
	}

	const [protocolRes, protocolsMetadata] = await Promise.all([
		getProtocol(protocol as string),
		fetch(PROTOCOLS_METADATA).then((res) => res.json())
	])
	const protocolData = await getProtocolData(protocol as string, protocolRes, true, protocolsMetadata)
	const response = { protocol: protocolData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}
