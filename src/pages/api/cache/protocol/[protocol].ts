import { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolDataV2 } from '~/api/categories/protocols/getProtocolData'
import { getProtocol } from '~/api/categories/protocols'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import metadata from '~/utils/metadata'
const { protocolMetadata } = metadata

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}
	const { protocol } = req.query
	const cacheKey = `object-protocol-${protocol}`

	const cachedData = await getObjectCache(cacheKey)
	if (cachedData) {
		console.log('Cache hit')
		return res.json(cachedData)
	}

	const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)

	if (!metadata) {
		return res.status(404).json({ error: 'Protocol not found' })
	}

	const protocolRes = await getProtocol(protocol as string)
	const protocolData = await getProtocolDataV2(protocol as string, protocolRes, true)
	const response = { protocol: protocolData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}
