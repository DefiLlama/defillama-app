import type { NextApiRequest, NextApiResponse } from 'next'
import { llamaDb } from '~/server/db/llama'

interface ProtocolAvailability {
	protocol: string
	has_pf: boolean
	has_ps: boolean
}

interface ResponseData {
	pf: string[]
	ps: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const rows = await llamaDb.any<ProtocolAvailability>(
			`
			SELECT
				protocol,
				BOOL_OR(mcap IS NOT NULL AND fees_1d IS NOT NULL AND fees_1d > 0) as has_pf,
				BOOL_OR(mcap IS NOT NULL AND revenue_1d IS NOT NULL AND revenue_1d > 0) as has_ps
			FROM lens.metrics_protocol_daily
			WHERE date >= CURRENT_DATE - INTERVAL '365 day'
			GROUP BY protocol
			HAVING BOOL_OR(mcap IS NOT NULL AND fees_1d IS NOT NULL AND fees_1d > 0)
				OR BOOL_OR(mcap IS NOT NULL AND revenue_1d IS NOT NULL AND revenue_1d > 0)
			`
		)

		const pf: string[] = []
		const ps: string[] = []

		for (const row of rows) {
			if (row.has_pf) pf.push(row.protocol)
			if (row.has_ps) ps.push(row.protocol)
		}

		res.setHeader('Cache-Control', 'public, max-age=3600')
		return res.status(200).json({ pf, ps })
	} catch (error) {
		console.log('Failed to fetch pf/ps protocols', error)
		return res.status(500).json({ error: 'Failed to load pf/ps protocol availability' })
	}
}
