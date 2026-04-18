import type { NextApiRequest, NextApiResponse } from 'next'
import { getLiquidationsOverviewPageData } from '~/containers/LiquidationsV2/queries'
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

	const auth = await validateSubscription(req.headers.authorization)
	if (auth.valid === false) {
		return res.status(auth.status).json({ error: auth.error })
	}

	try {
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()

		const data = await getLiquidationsOverviewPageData({
			chainMetadata: metadataModule.default.chainMetadata,
			protocolMetadata: metadataModule.default.protocolMetadata
		})

		return res.status(200).json(data)
	} catch (error) {
		console.error('Failed to fetch liquidations overview data:', error)
		return res.status(500).json({ error: 'Failed to fetch liquidations overview data' })
	}
}
