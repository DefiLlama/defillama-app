import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenLiquidationsSectionDataFromNetwork } from '~/containers/LiquidationsV2/queries'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { validateSubscription } from '~/utils/apiAuth'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'

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

	const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : ''
	if (!symbol) {
		return res.status(400).json({ error: 'Missing symbol parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const normalizedSymbol = normalizeLiquidationsTokenSymbol(symbol)

		if (!normalizedSymbol || !metadataModule.default.liquidationsTokenSymbolsSet.has(normalizedSymbol)) {
			return res.status(404).json({ error: 'Token liquidations not found' })
		}

		const shouldUseDatasetCache = isDatasetCacheEnabled()
		const data = shouldUseDatasetCache
			? await (async () => {
					const { getTokenLiquidationsFromCache } = await import('~/server/datasetCache/liquidations')
					return getTokenLiquidationsFromCache(normalizedSymbol, {
						chainMetadata: metadataModule.default.chainMetadata,
						protocolMetadata: metadataModule.default.protocolMetadata
					})
				})()
			: await getTokenLiquidationsSectionDataFromNetwork(normalizedSymbol, {
					chainMetadata: metadataModule.default.chainMetadata,
					protocolMetadata: metadataModule.default.protocolMetadata
				})

		if (!data) {
			return res.status(404).json({ error: 'Token liquidations not found' })
		}

		return res.status(200).json(data)
	} catch (error) {
		console.error(`Failed to fetch token liquidations for ${symbol}:`, error)
		return res.status(500).json({ error: 'Failed to fetch token liquidations data' })
	}
}
