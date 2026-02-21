import { useQuery } from '@tanstack/react-query'
import {
	fetchStablecoinAssetsApi,
	fetchStablecoinChartApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi
} from '~/containers/Stablecoins/api'
import type { StablecoinChartPoint } from '~/containers/Stablecoins/api.types'
import { formatPeggedAssetsData } from '~/containers/Stablecoins/utils'

type StablecoinChartMcapPoint = {
	date: number
	mcap: Record<string, number>
}

const toFiniteNumber = (value: unknown, fallback: number): number => {
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : fallback
}

export function useStablecoinsData(chain: string) {
	return useQuery({
		queryKey: ['pro-dashboard', 'stablecoins-overview', chain],
		queryFn: async () => {
			// Fetch all required data in parallel
			const [peggedData, chainData, priceData, rateData] = await Promise.all([
				fetchStablecoinAssetsApi(),
				fetchStablecoinChartApi(chain === 'All' ? 'all-llama-app' : chain),
				fetchStablecoinPricesApi(),
				fetchStablecoinRatesApi()
			])

			const { peggedAssets } = peggedData
			const breakdown = chainData?.breakdown

			if (!breakdown) {
				return []
			}

			// Build chart data by pegged asset
			let chartDataByPeggedAsset: StablecoinChartMcapPoint[][] = []
			const peggedNameToChartDataIndex: Record<string, number> = {}
			let lastTimestamp = 0

			chartDataByPeggedAsset = peggedAssets.map((elem, i: number) => {
				peggedNameToChartDataIndex[elem.name] = i
				const charts = breakdown[elem.id] ?? []
				const formattedCharts = charts
					.map((chart: StablecoinChartPoint) => ({
						date: Number(chart.date),
						mcap: chart.totalCirculatingUSD
					}))
					.filter((point): point is StablecoinChartMcapPoint => point.mcap !== undefined)

				if (formattedCharts.length > 0) {
					lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
				}

				return formattedCharts
			})

			// Normalize chart data to same end date
			for (const chart of chartDataByPeggedAsset) {
				const last = chart[chart.length - 1]
				if (!last) continue

				let lastDate = Number(last.date)
				while (lastDate < lastTimestamp) {
					lastDate += 24 * 3600
					chart.push({
						...last,
						date: lastDate
					})
				}
			}

			// Format the assets data
			const filteredPeggedAssets = formatPeggedAssetsData({
				peggedAssets,
				chartDataByPeggedAsset,
				priceData,
				rateData,
				peggedNameToChartDataIndex,
				chain: chain === 'All' ? null : chain
			})

			// Transform to match our table structure
			return filteredPeggedAssets.map((asset) => {
				const typedAsset = asset as Record<string, unknown>
				return {
					name: typeof typedAsset.name === 'string' ? typedAsset.name : '',
					symbol: typeof typedAsset.symbol === 'string' ? typedAsset.symbol : '',
					mcap: toFiniteNumber(typedAsset.mcap, 0),
					price: toFiniteNumber(typedAsset.price, 1),
					change_1d: toFiniteNumber(typedAsset.change_1d, 0),
					change_7d: toFiniteNumber(typedAsset.change_7d, 0),
					change_1m: toFiniteNumber(typedAsset.change_1m, 0),
					pegDeviation: typedAsset.pegDeviation,
					chains: Array.isArray(typedAsset.chains) ? (typedAsset.chains as string[]) : [],
					pegType: typeof typedAsset.pegType === 'string' ? typedAsset.pegType : '',
					gecko_id: typeof typedAsset.gecko_id === 'string' ? typedAsset.gecko_id : null
				}
			})
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000 // 5 minutes
	})
}
