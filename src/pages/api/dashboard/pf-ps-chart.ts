import type { NextApiRequest, NextApiResponse } from 'next'
import { llamaDb } from '~/server/db/llama'

interface ChartDataPoint {
	timestamp: number
	ratio: number | null
}

type ResponseData = [number, number][] | { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { protocol, type } = req.query

	if (!protocol || typeof protocol !== 'string') {
		return res.status(400).json({ error: 'Protocol parameter is required' })
	}

	if (!type || (type !== 'pf' && type !== 'ps')) {
		return res.status(400).json({ error: 'Type parameter must be "pf" or "ps"' })
	}

	try {
		const rows = await llamaDb.any<ChartDataPoint>(
			`
			WITH base AS (
				SELECT date, protocol, mcap, fees_1d, revenue_1d
				FROM lens.metrics_protocol_daily
				WHERE protocol = $1
					AND date >= CURRENT_DATE - INTERVAL '395 day'
					AND mcap IS NOT NULL
			),
			rolling AS (
				SELECT date, protocol, mcap,
					SUM(fees_1d) OVER (
						PARTITION BY protocol
						ORDER BY date
						ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
					) AS fees_30d,
					SUM(revenue_1d) OVER (
						PARTITION BY protocol
						ORDER BY date
						ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
					) AS revenue_30d
				FROM base
			)
			SELECT
				EXTRACT(EPOCH FROM date)::bigint AS timestamp,
				CASE
					WHEN $2 = 'pf' AND fees_30d > 0 THEN mcap / (fees_30d * 12)
					WHEN $2 = 'ps' AND revenue_30d > 0 THEN mcap / (revenue_30d * 12)
					ELSE NULL
				END AS ratio
			FROM rolling
			WHERE date >= CURRENT_DATE - INTERVAL '365 day'
			ORDER BY date ASC
			`,
			[protocol, type]
		)

		const result: [number, number][] = rows
			.filter((row) => row.ratio !== null)
			.map((row) => [row.timestamp, row.ratio as number])

		res.setHeader('Cache-Control', 'public, max-age=3600')
		return res.status(200).json(result)
	} catch (error) {
		console.log('Failed to fetch pf/ps chart data', error)
		return res.status(500).json({ error: 'Failed to load pf/ps chart data' })
	}
}
