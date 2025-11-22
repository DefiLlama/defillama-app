import type { NextApiRequest, NextApiResponse } from 'next'
import type { NormalizedRow } from '~/containers/ProDashboard/components/UnifiedTable/types'
import { sanitizeRowHeaders } from '~/containers/ProDashboard/components/UnifiedTable/utils/rowHeaders'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { fetchChainsTable } from '~/server/unifiedTable/chains'
import { fetchProtocolsTable } from '~/server/unifiedTable/protocols'

const ALLOWED_STRATEGIES: ReadonlyArray<UnifiedTableConfig['strategyType']> = ['protocols', 'chains']
const MAX_CHAIN_FILTERS = 100
const MAX_CHAIN_NAME_LENGTH = 200

const toArray = (value: string | string[] | undefined): string[] => {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

const parseNumber = (value: string | string[] | undefined): number | undefined => {
	if (!value || Array.isArray(value)) return undefined
	const parsed = parseFloat(value)
	return isNaN(parsed) ? undefined : parsed
}

const parseBoolean = (value: string | string[] | undefined): boolean | undefined => {
	if (!value || Array.isArray(value)) return undefined
	return value === 'true'
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

	const filters: TableFilters = {}

	if (query['protocols[]']) filters.protocols = toArray(query['protocols[]'])
	if (query['categories[]']) filters.categories = toArray(query['categories[]'])
	if (query['excludedCategories[]']) filters.excludedCategories = toArray(query['excludedCategories[]'])
	if (query['oracles[]']) filters.oracles = toArray(query['oracles[]'])
	if (query['chains[]']) filters.chains = toArray(query['chains[]'])
	if (query['poolTypes[]']) filters.poolTypes = toArray(query['poolTypes[]'])

	if (query.apyMin) filters.apyMin = parseNumber(query.apyMin)
	if (query.apyMax) filters.apyMax = parseNumber(query.apyMax)
	if (query.tvlMin) filters.tvlMin = parseNumber(query.tvlMin)
	if (query.tvlMax) filters.tvlMax = parseNumber(query.tvlMax)
	if (query.baseApyMin) filters.baseApyMin = parseNumber(query.baseApyMin)
	if (query.baseApyMax) filters.baseApyMax = parseNumber(query.baseApyMax)
	if (query.mcapMin) filters.mcapMin = parseNumber(query.mcapMin)
	if (query.mcapMax) filters.mcapMax = parseNumber(query.mcapMax)
	if (query.volumeDex24hMin) filters.volumeDex24hMin = parseNumber(query.volumeDex24hMin)
	if (query.volumeDex24hMax) filters.volumeDex24hMax = parseNumber(query.volumeDex24hMax)
	if (query.fees24hMin) filters.fees24hMin = parseNumber(query.fees24hMin)
	if (query.fees24hMax) filters.fees24hMax = parseNumber(query.fees24hMax)
	if (query.revenue24hMin) filters.revenue24hMin = parseNumber(query.revenue24hMin)
	if (query.revenue24hMax) filters.revenue24hMax = parseNumber(query.revenue24hMax)
	if (query.protocolCountMin) filters.protocolCountMin = parseNumber(query.protocolCountMin)
	if (query.protocolCountMax) filters.protocolCountMax = parseNumber(query.protocolCountMax)
	if (query.pfRatioMin) filters.pfRatioMin = parseNumber(query.pfRatioMin)
	if (query.pfRatioMax) filters.pfRatioMax = parseNumber(query.pfRatioMax)

	if (query.hasRewards) filters.hasRewards = parseBoolean(query.hasRewards)
	if (query.stablesOnly) filters.stablesOnly = parseBoolean(query.stablesOnly)
	if (query.activeLending) filters.activeLending = parseBoolean(query.activeLending)
	if (query.hasPerps) filters.hasPerps = parseBoolean(query.hasPerps)
	if (query.hasOptions) filters.hasOptions = parseBoolean(query.hasOptions)
	if (query.hasOpenInterest) filters.hasOpenInterest = parseBoolean(query.hasOpenInterest)
	if (query.multiChainOnly) filters.multiChainOnly = parseBoolean(query.multiChainOnly)
	if (query.parentProtocolsOnly) filters.parentProtocolsOnly = parseBoolean(query.parentProtocolsOnly)
	if (query.subProtocolsOnly) filters.subProtocolsOnly = parseBoolean(query.subProtocolsOnly)

	const config: UnifiedTableConfig = {
		id: `unified-table-${strategy}-${Date.now()}`,
		kind: 'unified-table',
		strategyType: strategy,
		rowHeaders: [],
		params: chains.length > 0 || category ? { chains, category: category || null } : null,
		filters: Object.keys(filters).length > 0 ? filters : undefined
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
