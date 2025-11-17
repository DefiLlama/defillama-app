import type { NextApiRequest, NextApiResponse } from 'next'
import { sanitizeRowHeaders } from '~/containers/ProDashboard/components/UnifiedTable/utils/rowHeaders'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { fetchChainsTable } from '~/server/unifiedTable/chains'
import { fetchProtocolsTable } from '~/server/unifiedTable/protocols'

type UnifiedTableApiRequest = {
	config: UnifiedTableConfig
	rowHeaders?: UnifiedRowHeaderType[]
}

const ALLOWED_STRATEGIES: ReadonlyArray<UnifiedTableConfig['strategyType']> = ['protocols', 'chains']
const MAX_CONFIG_ID_LENGTH = 200
const MAX_CHAIN_FILTERS = 100
const MAX_CHAIN_NAME_LENGTH = 200

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const getStrategyFromQuery = (value: string | string[] | undefined): UnifiedTableConfig['strategyType'] | null => {
	const strategy = Array.isArray(value) ? value[0] : value
	if (!strategy || !ALLOWED_STRATEGIES.includes(strategy as UnifiedTableConfig['strategyType'])) {
		return null
	}
	return strategy as UnifiedTableConfig['strategyType']
}

const isValidConfig = (raw: unknown): raw is UnifiedTableConfig => {
	if (!isPlainObject(raw)) return false

	const id = (raw as any).id
	const kind = (raw as any).kind
	const strategyType = (raw as any).strategyType

	if (typeof id !== 'string' || !id.trim() || id.length > MAX_CONFIG_ID_LENGTH) return false
	if (kind !== 'unified-table') return false
	if (strategyType !== 'protocols' && strategyType !== 'chains') return false

	const params = (raw as any).params
	if (params !== undefined && params !== null) {
		if (!isPlainObject(params)) return false

		const chains = (params as any).chains
		if (chains !== undefined && chains !== null) {
			if (!Array.isArray(chains) || chains.length > MAX_CHAIN_FILTERS) return false
			for (const value of chains) {
				if (typeof value !== 'string' || value.length > MAX_CHAIN_NAME_LENGTH) return false
			}
		}

		const category = (params as any).category
		if (category !== undefined && category !== null) {
			if (typeof category !== 'string' || category.length > MAX_CHAIN_NAME_LENGTH) return false
		}
	}

	return true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const strategy = getStrategyFromQuery(req.query.strategy)
	if (!strategy) {
		return res.status(404).json({ error: 'Unknown unified table strategy' })
	}

	const rawBody = req.body as unknown
	if (!isPlainObject(rawBody)) {
		return res.status(400).json({ error: 'Invalid unified table request' })
	}

	const rawConfig = (rawBody as UnifiedTableApiRequest).config
	if (!isValidConfig(rawConfig)) {
		return res.status(400).json({ error: 'Invalid unified table configuration' })
	}

	const config = rawConfig as UnifiedTableConfig

	if (config.strategyType !== strategy) {
		return res.status(400).json({ error: 'Invalid unified table configuration' })
	}

	const rowHeadersInput = Array.isArray((rawBody as UnifiedTableApiRequest).rowHeaders)
		? (rawBody as UnifiedTableApiRequest).rowHeaders?.filter(
				(value): value is UnifiedRowHeaderType => typeof value === 'string'
		  )
		: config.rowHeaders

	const rowHeaders = sanitizeRowHeaders(rowHeadersInput, config.strategyType)

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
