import type { NextApiRequest, NextApiResponse } from 'next'
import { getLiquidationsChainPageDataFromNetwork } from '~/containers/LiquidationsV2/queries'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { validateSubscription } from '~/utils/apiAuth'

export const config = {
	api: {
		responseLimit: false
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', 'private, no-store')

	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
	const chain = typeof req.query.chain === 'string' ? req.query.chain : ''

	if (!protocol || !chain) {
		return res.status(400).json({ error: 'Missing protocol or chain parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()

		const shouldUseDatasetCache = isDatasetCacheEnabled()
		const data = shouldUseDatasetCache
			? await (async () => {
					const { getLiquidationsChainFromCache } = await import('~/server/datasetCache/liquidations')
					return getLiquidationsChainFromCache(protocol, chain, {
						chainMetadata: metadataModule.default.chainMetadata,
						protocolMetadata: metadataModule.default.protocolMetadata
					})
				})()
			: await getLiquidationsChainPageDataFromNetwork(protocol, chain, {
					chainMetadata: metadataModule.default.chainMetadata,
					protocolMetadata: metadataModule.default.protocolMetadata
				})

		if (!data) {
			return res.status(404).json({ error: 'Liquidations chain not found' })
		}

		return res.status(200).json(data)
	} catch (error) {
		console.error(`Failed to fetch liquidations chain data for ${protocol}/${chain}:`, error)
		return res.status(500).json({ error: 'Failed to fetch liquidations chain data' })
	}
}
