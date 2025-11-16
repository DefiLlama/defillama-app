import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchProtocolsTable } from '~/server/unifiedTable/protocols'
import { fetchChainsTable } from '~/server/unifiedTable/chains'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'

type UnifiedTableApiRequest = {
	config: UnifiedTableConfig
	rowHeaders?: UnifiedRowHeaderType[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const strategy = Array.isArray(req.query.strategy) ? req.query.strategy[0] : req.query.strategy
	if (!strategy || (strategy !== 'protocols' && strategy !== 'chains')) {
		return res.status(404).json({ error: 'Unknown unified table strategy' })
	}

	const body = req.body as UnifiedTableApiRequest | null
	if (!body?.config) {
		return res.status(400).json({ error: 'Missing unified table configuration' })
	}

	const { config } = body
	const rowHeaders = Array.isArray(body.rowHeaders) && body.rowHeaders.length ? body.rowHeaders : config.rowHeaders ?? []

	try {
		if (strategy === 'protocols') {
			const rows = await fetchProtocolsTable({ config, rowHeaders })
			return res.status(200).json({ rows })
		}

		const rows = await fetchChainsTable({ config })
		return res.status(200).json({ rows })
	} catch (error) {
		console.error('Failed to fetch unified table data', error)
		return res.status(500).json({ error: 'Failed to load unified table data' })
	}
}
