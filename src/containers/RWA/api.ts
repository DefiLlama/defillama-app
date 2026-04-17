import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IFetchedRWAProject,
	IRWAStatsResponse,
	IRWAChartDataByAsset,
	IRWAAssetData,
	IRWABreakdownChartParams,
	IRWABreakdownChartResponse,
	IRWABreakdownChartRow,
	RWAAssetChartDimension,
	RWAAssetChartRow,
	RWAAssetChartTarget
} from './api.types'

export function toUnixMsTimestamp(ts: number): number {
	// API timestamps are historically in unix seconds. Normalize to ms for ECharts time axis.
	// Keep this tolerant to already-ms values to avoid double conversion.
	return Number.isFinite(ts) && ts > 0 && ts < 1e12 ? ts * 1e3 : ts
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

/**
 * Fetch current active TVL values for RWA projects.
 */
export async function fetchRWAActiveTVLs(): Promise<Array<IFetchedRWAProject>> {
	return fetchJson<Array<IFetchedRWAProject>>(`${RWA_SERVER_URL}/current`)
}

/**
 * Fetch aggregate stats for the RWA dashboard.
 */
export async function fetchRWAStats(): Promise<IRWAStatsResponse> {
	return fetchJson<IRWAStatsResponse>(`${RWA_SERVER_URL}/stats`)
}

/**
 * Fetch details for a single RWA asset by id.
 */
export async function fetchRWAAssetDataById(assetId: string): Promise<IFetchedRWAProject> {
	const encodedAssetId = encodeURIComponent(assetId)
	return fetchJson<IFetchedRWAProject>(`${RWA_SERVER_URL}/rwa/${encodedAssetId}`)
}

export async function fetchRWAChartDataByAsset({
	target,
	includeStablecoins,
	includeGovernance
}: {
	target: RWAAssetChartTarget
	includeStablecoins: boolean
	includeGovernance: boolean
}): Promise<IRWAChartDataByAsset | null> {
	let chartUrl = `${RWA_SERVER_URL}/chart/chain/all`

	switch (target.kind) {
		case 'all':
			break
		case 'chain':
			chartUrl = `${RWA_SERVER_URL}/chart/chain/${target.slug}`
			break
		case 'category':
			chartUrl = `${RWA_SERVER_URL}/chart/category/${target.slug}`
			break
		case 'platform':
			chartUrl = `${RWA_SERVER_URL}/chart/platform/${target.slug}`
			break
		case 'assetGroup':
			chartUrl = `${RWA_SERVER_URL}/chart/assetGroup/${target.slug}`
			break
		default:
			assertNever(target)
	}

	const searchParams = new URLSearchParams({
		includeStablecoin: String(includeStablecoins),
		includeGovernance: String(includeGovernance)
	})

	return fetchJson<IRWAChartDataByAsset>(`${chartUrl}/asset-breakdown?${searchParams.toString()}`).catch((error) => {
		console.error('Failed to fetch RWA chart data by asset:', error)
		return null
	})
}

function normalizeRWABreakdownChartRows(rows: IRWABreakdownChartResponse): IRWABreakdownChartResponse {
	const normalizedRows: IRWABreakdownChartResponse = []

	for (const row of rows ?? []) {
		const normalizedRow: IRWABreakdownChartRow = { timestamp: toUnixMsTimestamp(Number(row.timestamp)) }

		for (const key in row) {
			if (key === 'timestamp') continue
			normalizedRow[key] = row[key]
		}

		normalizedRows.push(normalizedRow)
	}

	return ensureChronologicalRows(normalizedRows)
}

/**
 * Fetch chain-level RWA breakdown chart data.
 */
export async function fetchRWAChainBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	const searchParams = new URLSearchParams()
	if (params.key && params.key !== 'onChainMcap') searchParams.set('key', params.key)
	if (params.includeStablecoin) searchParams.set('includeStablecoin', 'true')
	if (params.includeGovernance) searchParams.set('includeGovernance', 'true')
	const qs = searchParams.toString()
	const url = `${RWA_SERVER_URL}/chart/chain-breakdown${qs ? `?${qs}` : ''}`
	return fetchJson<IRWABreakdownChartResponse>(url)
		.then((rows) => normalizeRWABreakdownChartRows(rows ?? []))
		.catch((error) => {
			console.error('Failed to fetch RWA chain breakdown chart data:', error)
			return null
		})
}

/**
 * Fetch category-level RWA breakdown chart data.
 */
export async function fetchRWACategoryBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	const searchParams = new URLSearchParams()
	if (params.key && params.key !== 'onChainMcap') searchParams.set('key', params.key)
	if (params.includeStablecoin) searchParams.set('includeStablecoin', 'true')
	if (params.includeGovernance) searchParams.set('includeGovernance', 'true')
	const qs = searchParams.toString()
	const url = `${RWA_SERVER_URL}/chart/category-breakdown${qs ? `?${qs}` : ''}`
	return fetchJson<IRWABreakdownChartResponse>(url)
		.then((rows) => normalizeRWABreakdownChartRows(rows ?? []))
		.catch((error) => {
			console.error('Failed to fetch RWA category breakdown chart data:', error)
			return null
		})
}

/**
 * Fetch platform-level RWA breakdown chart data.
 */
export async function fetchRWAPlatformBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	const searchParams = new URLSearchParams()
	if (params.key && params.key !== 'onChainMcap') searchParams.set('key', params.key)
	if (params.includeStablecoin) searchParams.set('includeStablecoin', 'true')
	if (params.includeGovernance) searchParams.set('includeGovernance', 'true')
	const qs = searchParams.toString()
	const url = `${RWA_SERVER_URL}/chart/platform-breakdown${qs ? `?${qs}` : ''}`
	return fetchJson<IRWABreakdownChartResponse>(url)
		.then((rows) => normalizeRWABreakdownChartRows(rows ?? []))
		.catch((error) => {
			console.error('Failed to fetch RWA platform breakdown chart data:', error)
			return null
		})
}

/**
 * Fetch asset-group-level RWA breakdown chart data.
 */
export async function fetchRWAAssetGroupBreakdownChartData(
	params: IRWABreakdownChartParams = {}
): Promise<IRWABreakdownChartResponse | null> {
	const searchParams = new URLSearchParams()
	if (params.key && params.key !== 'onChainMcap') searchParams.set('key', params.key)
	if (params.includeStablecoin) searchParams.set('includeStablecoin', 'true')
	if (params.includeGovernance) searchParams.set('includeGovernance', 'true')
	const qs = searchParams.toString()
	const url = `${RWA_SERVER_URL}/chart/assetGroup-breakdown${qs ? `?${qs}` : ''}`
	return fetchJson<IRWABreakdownChartResponse>(url)
		.then((rows) => normalizeRWABreakdownChartRows(rows ?? []))
		.catch((error) => {
			console.error('Failed to fetch RWA asset-group breakdown chart data:', error)
			return null
		})
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
