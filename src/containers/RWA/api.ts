import { RWA_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IFetchedRWAProject,
	IRWAStatsResponse,
	IRWAChartDataByTicker,
	IRWAAssetData,
	RWAAssetChartDimension,
	RWAAssetChartRow
} from './api.types'

export async function getRWAActiveTVLs(): Promise<Array<IFetchedRWAProject>> {
	return fetchJson<Array<IFetchedRWAProject>>(`${RWA_SERVER_URL}/current?z=0`)
}

export async function getRWAStats(): Promise<IRWAStatsResponse> {
	return fetchJson<IRWAStatsResponse>(`${RWA_SERVER_URL}/stats?z=0`)
}

export async function getRWAAssetDataById(assetId: string): Promise<IFetchedRWAProject> {
	return fetchJson<IFetchedRWAProject>(`${RWA_SERVER_URL}/rwa/${assetId}`)
}

export async function getRWAChartDataByTicker({
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

	return fetchJson<IRWAChartDataByTicker>(`${chartUrl}/ticker-breakdown`).catch(() => null)
}

export async function getRWAAssetChartData(assetId: string): Promise<IRWAAssetData['chartDataset']> {
	return fetchJson<Array<{ timestamp: number; onChainMcap: number; activeMcap: number; defiActiveTvl: number }>>(
		`${RWA_SERVER_URL}/chart/asset/${assetId}`
	)
		.then((data) => {
			const source: RWAAssetChartRow[] =
				(data ?? []).map((item) => ({
					timestamp: item.timestamp * 1e3,
					'DeFi Active TVL': item.defiActiveTvl ?? null,
					'Active Mcap': item.activeMcap ?? null,
					'Onchain Mcap': item.onChainMcap ?? null
				})) ?? []

			const dimensions: RWAAssetChartDimension[] = [
				'timestamp',
				'DeFi Active TVL',
				'Active Mcap',
				'Onchain Mcap'
			]

			return { source, dimensions }
		})
		.catch(() => null)
}
