import { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
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

	const normalizedName = slug(protocol as string)
	const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

	if (!metadata) {
		return res.status(404).json({ error: 'Protocol not found' })
	}

	const protocolRes = await getProtocol(protocol as string)
	const protocolData = await getProtocolData(protocol as string, protocolRes as any, true, metadata)
	const response = { protocol: protocolData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}
