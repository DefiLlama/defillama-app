import type { NextApiRequest, NextApiResponse } from 'next'
import type { NormalizedRow } from '~/containers/ProDashboard/components/UnifiedTable/types'
import { sanitizeRowHeaders } from '~/containers/ProDashboard/components/UnifiedTable/utils/rowHeaders'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { fetchChainsTable } from '~/server/unifiedTable/chains'
import { fetchProtocolsTable } from '~/server/unifiedTable/protocols'

const ALLOWED_STRATEGIES: ReadonlyArray<UnifiedTableConfig['strategyType']> = ['protocols', 'chains']
const MAX_CHAIN_FILTERS = 100
const MAX_CHAIN_NAME_LENGTH = 200

const toArray = (value: string | string[] | undefined): string[] => {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

const getStrategyFromQuery = (value: string | string[] | undefined): UnifiedTableConfig['strategyType'] | null => {
	const strategy = Array.isArray(value) ? value[0] : value
	if (!strategy || !ALLOWED_STRATEGIES.includes(strategy as UnifiedTableConfig['strategyType'])) {
		return null
	}
	return strategy as UnifiedTableConfig['strategyType']
}

const parseQueryToConfig = (query: NextApiRequest['query']): UnifiedTableConfig | null => {
	const strategy = getStrategyFromQuery(query.strategy)
	if (!strategy) return null

	const chains = toArray(query['chains[]'])
	if (chains.length > MAX_CHAIN_FILTERS) return null
	if (chains.some((c) => c.length > MAX_CHAIN_NAME_LENGTH)) return null

	const category = Array.isArray(query.category) ? query.category[0] : query.category
	if (category && category.length > MAX_CHAIN_NAME_LENGTH) return null

	const config: UnifiedTableConfig = {
		id: `unified-table-${strategy}-${Date.now()}`,
		kind: 'unified-table',
		strategyType: strategy,
		rowHeaders: [],
		params: chains.length > 0 || category ? { chains, category: category || null } : null
	}

	return config
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const strategy = getStrategyFromQuery(req.query.strategy)
	if (!strategy) {
		return res.status(404).json({ error: 'Unknown unified table strategy' })
	}

	const config = parseQueryToConfig(req.query)
	if (!config) {
		return res.status(400).json({ error: 'Invalid unified table configuration' })
	}

	const rowHeadersFromQuery = toArray(req.query['rowHeaders[]']).filter(
		(value): value is UnifiedRowHeaderType =>
			value === 'parent-protocol' || value === 'protocol' || value === 'chain' || value === 'category'
	)

	const rowHeaders = sanitizeRowHeaders(
		rowHeadersFromQuery.length > 0 ? rowHeadersFromQuery : config.rowHeaders,
		config.strategyType
	)

	try {
		let rows: NormalizedRow[]
		if (strategy === 'protocols') {
			rows = await fetchProtocolsTable({ config, rowHeaders })
		} else {
			rows = await fetchChainsTable({ config })
		}

		res.setHeader('Cache-Control', 'public, max-age=300')
		return res.status(200).json({ rows })
	} catch (error) {
		console.log('Failed to fetch unified table data', error)
		return res.status(500).json({ error: 'Failed to load unified table data' })
	}
}
