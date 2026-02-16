import { RWA_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IFetchedRWAProject,
	IRWAStatsResponse,
	IRWAChartDataByTicker,
	IRWAAssetData,
	IRWABreakdownChartParams,
	IRWABreakdownChartResponse,
	IRWABreakdownChartRow,
	RWAAssetChartDimension,
	RWAAssetChartRow
} from './api.types'

export function toUnixMsTimestamp(ts: number): number {
	// API timestamps are historically in unix seconds. Normalize to ms for ECharts time axis.
	// Keep this tolerant to already-ms values to avoid double conversion.
	return Number.isFinite(ts) && ts > 0 && ts < 1e12 ? ts * 1e3 : ts
}

/**
 * Fetch current active TVL values for RWA projects.
 */
export async function fetchRWAActiveTVLs(): Promise<Array<IFetchedRWAProject>> {
	return fetchJson<Array<IFetchedRWAProject>>(`${RWA_SERVER_URL}/current?z=0`)
}

/**
 * Fetch aggregate stats for the RWA dashboard.
 */
export async function fetchRWAStats(): Promise<IRWAStatsResponse> {
	return fetchJson<IRWAStatsResponse>(`${RWA_SERVER_URL}/stats?z=0`)
}

/**
 * Fetch details for a single RWA asset by id.
 */
export async function fetchRWAAssetDataById(assetId: string): Promise<IFetchedRWAProject> {
	const encodedAssetId = encodeURIComponent(assetId)
	return fetchJson<IFetchedRWAProject>(`${RWA_SERVER_URL}/rwa/${encodedAssetId}`)
}

/**
 * Fetch ticker breakdown chart data for the selected RWA filter.
 */
export async function fetchRWAChartDataByTicker({
	selectedChain,
	selectedCategory,
	selectedPlatform
}: {
	selectedChain?: string
	selectedCategory?: string
	selectedPlatform?: string
}): Promise<IRWAChartDataByTicker | null> {
	const chartUrl = selectedChain
		? `${RWA_SERVER_URL}/chart/chain/${selectedChain}`
		: selectedCategory
			? `${RWA_SERVER_URL}/chart/category/${selectedCategory}`
			: selectedPlatform
				? `${RWA_SERVER_URL}/chart/platform/${selectedPlatform}`
				: `${RWA_SERVER_URL}/chart/chain/all`

	return fetchJson<IRWAChartDataByTicker>(`${chartUrl}/ticker-breakdown`).catch((error) => {
		console.error('Failed to fetch RWA chart data by ticker:', error)
		return null
	})
}

type RWABreakdownChartType = 'chain' | 'category' | 'platform'

function createRWABreakdownChartUrl(
	chartType: RWABreakdownChartType,
	params: IRWABreakdownChartParams = {}
): string {
	const searchParams = new URLSearchParams()

	if (params.key && params.key !== 'onChainMcap') {
		searchParams.set('key', params.key)
	}
	if (params.includeStablecoin) {
		searchParams.set('includeStablecoin', 'true')
	}
	if (params.includeGovernance) {
		searchParams.set('includeGovernance', 'true')
	}

	const queryString = searchParams.toString()
	return `${RWA_SERVER_URL}/chart/${chartType}-breakdown${queryString ? `?${queryString}` : ''}`
}

function normalizeRWABreakdownChartRows(rows: IRWABreakdownChartResponse): IRWABreakdownChartResponse {
	const normalizedRows: IRWABreakdownChartResponse = []

	for (const row of rows ?? []) {
		const timestampRaw = Number(row.timestamp)
		if (!Number.isFinite(timestampRaw)) continue

		const normalizedRow: IRWABreakdownChartRow = { timestamp: toUnixMsTimestamp(timestampRaw) }

		for (const [key, value] of Object.entries(row)) {
			if (key === 'timestamp') continue
			const numericValue = Number(value)
			if (!Number.isFinite(numericValue)) continue
			normalizedRow[key] = numericValue
		}

		normalizedRows.push(normalizedRow)
	}

	return normalizedRows.toSorted((a, b) => a.timestamp - b.timestamp)
}

async function fetchRWABreakdownChartData(
	chartType: RWABreakdownChartType,
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	const url = createRWABreakdownChartUrl(chartType, params)
	return fetchJson<IRWABreakdownChartResponse>(url)
		.then((rows) => normalizeRWABreakdownChartRows(rows ?? []))
		.catch((error) => {
			console.error(`Failed to fetch RWA ${chartType} breakdown chart data:`, error)
			return null
		})
}

/**
 * Fetch chain-level RWA breakdown chart data.
 */
export async function fetchRWAChainBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	return fetchRWABreakdownChartData('chain', params)
}

/**
 * Fetch category-level RWA breakdown chart data.
 */
export async function fetchRWACategoryBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	return fetchRWABreakdownChartData('category', params)
}

/**
 * Fetch platform-level RWA breakdown chart data.
 */
export async function fetchRWAPlatformBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	return fetchRWABreakdownChartData('platform', params)
}

/**
 * Fetch and normalize historical chart data for a single RWA asset.
 */
export async function fetchRWAAssetChartData(assetId: string): Promise<IRWAAssetData['chartDataset']> {
	const encodedAssetId = encodeURIComponent(assetId)
	return fetchJson<Array<{ timestamp: number; onChainMcap: number; activeMcap: number; defiActiveTvl: number }>>(
		`${RWA_SERVER_URL}/chart/asset/${encodedAssetId}`
	)
		.then((data) => {
			const source: RWAAssetChartRow[] = (data ?? []).map((item) => ({
				timestamp: toUnixMsTimestamp(item.timestamp),
				'DeFi Active TVL': item.defiActiveTvl ?? null,
				'Active Mcap': item.activeMcap ?? null,
				'Onchain Mcap': item.onChainMcap ?? null
			}))

			const dimensions: RWAAssetChartDimension[] = ['timestamp', 'DeFi Active TVL', 'Active Mcap', 'Onchain Mcap']

			return { source, dimensions }
		})
		.catch((error) => {
			console.error('Failed to fetch RWA asset chart data:', error)
			return null
		})
}
