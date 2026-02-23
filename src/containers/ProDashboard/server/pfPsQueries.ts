import { llamaDb } from '~/server/db/llama'

interface ChartDataPoint {
	timestamp: number
	ratio: number | null
}

interface ProtocolAvailability {
	protocol: string
	has_pf: boolean
	has_ps: boolean
}

export async function fetchPfPsChartData(protocol: string, type: 'pf' | 'ps'): Promise<[number, number][]> {
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

	return rows.filter((row) => row.ratio !== null).map((row) => [row.timestamp, row.ratio as number] as [number, number])
}

export async function fetchPfPsProtocols(): Promise<{ pf: string[]; ps: string[] }> {
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

	return { pf, ps }
}
