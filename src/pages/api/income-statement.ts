import type { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { protocol } = req.query
	if (!protocol || typeof protocol !== 'string') {
		return res.status(400).json({ error: 'protocol parameter is required' })
	}

	try {
		const normalized = slug(protocol)
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const { protocolMetadata } = metadataModule.default
		let metadata: IProtocolMetadata | null = null

		for (const key in protocolMetadata) {
			const record = protocolMetadata[key]
			if (slug(record.displayName) === normalized) {
				metadata = record
				break
			}
		}

		if (!metadata) {
			return res.status(404).json({ error: 'Protocol not found' })
		}

		const data = await getProtocolIncomeStatement({ metadata })
		res.setHeader('Cache-Control', 'public, max-age=3600')
		return res.status(200).json(data)
	} catch (error) {
		console.log('Failed to fetch income statement', error)
		return res.status(500).json({ error: 'Failed to fetch income statement' })
	}
}
