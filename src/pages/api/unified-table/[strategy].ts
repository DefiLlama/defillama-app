import type { NextApiRequest, NextApiResponse } from 'next'
import type { NormalizedRow } from '~/containers/ProDashboard/components/UnifiedTable/types'
import { sanitizeRowHeaders } from '~/containers/ProDashboard/components/UnifiedTable/utils/rowHeaders'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { fetchProtocolsTable, type ChainMetrics } from '~/server/unifiedTable/protocols'
import { toRawArrayParam } from '~/utils/routerQuery'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const MAX_CHAIN_FILTERS = 100
const MAX_CHAIN_NAME_LENGTH = 200

const parseQueryToConfig = (query: NextApiRequest['query']): UnifiedTableConfig | null => {
	const chains = toRawArrayParam(query['chains[]'])
	if (chains.length > MAX_CHAIN_FILTERS) return null
	if (chains.some((c) => c.length > MAX_CHAIN_NAME_LENGTH)) return null

	const category = Array.isArray(query.category) ? query.category[0] : query.category
	if (category && category.length > MAX_CHAIN_NAME_LENGTH) return null

	const config: UnifiedTableConfig = {
		id: `unified-table-${Date.now()}`,
		kind: 'unified-table',
		rowHeaders: [],
		params: chains.length > 0 || category ? { chains, category: category || null } : null
	}

	return config
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const config = parseQueryToConfig(req.query)
	if (!config) {
		return res.status(400).json({ error: 'Invalid unified table configuration' })
	}

	const rowHeadersFromQuery = toRawArrayParam(req.query['rowHeaders[]']).filter(
		(value): value is UnifiedRowHeaderType =>
			value === 'parent-protocol' || value === 'protocol' || value === 'chain' || value === 'category'
	)

	const rowHeaders = sanitizeRowHeaders(rowHeadersFromQuery.length > 0 ? rowHeadersFromQuery : config.rowHeaders)

	try {
		let rows: NormalizedRow[]
		let chainMetrics: Record<string, ChainMetrics> | undefined

		const result = await fetchProtocolsTable({ config, rowHeaders })
		rows = result.rows
		chainMetrics = result.chainMetrics

		res.setHeader('Cache-Control', 'public, max-age=300')
		return res.status(200).json({ rows, chainMetrics })
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to load unified table data' })
	}
}

export default withApiRouteTelemetry('/api/unified-table/[strategy]', handler)
