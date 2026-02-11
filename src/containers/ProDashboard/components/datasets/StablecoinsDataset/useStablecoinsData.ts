import { useQuery } from '@tanstack/react-query'
import { PEGGEDCHART_API, PEGGEDPRICES_API, PEGGEDRATES_API, PEGGEDS_API } from '~/constants'
import type { PeggedAssetApi, PeggedAssetsApiResponse } from '~/containers/Stablecoins/api.types'
import { type FilteredPeggedAsset, formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { fetchJson } from '~/utils/async'

export function useStablecoinsData(chain: string) {
	return useQuery({
		queryKey: ['stablecoins-overview', chain],
		queryFn: async () => {
			// Fetch all required data in parallel
			const [peggedData, chainData, priceData, rateData] = await Promise.all([
				fetchJson<PeggedAssetsApiResponse>(PEGGEDS_API),
				fetchJson<{ breakdown?: Record<string, unknown[]> }>(
					`${PEGGEDCHART_API}/${chain === 'All' ? 'all-llama-app' : chain}`
				),
				fetchJson(PEGGEDPRICES_API),
				fetchJson(PEGGEDRATES_API)
			])

			const { peggedAssets } = peggedData
			const breakdown = chainData?.breakdown

			if (!breakdown) {
				return []
			}

			// Build chart data by pegged asset
			let chartDataByPeggedAsset = []
			let peggedNameToChartDataIndex: any = {}
			let lastTimestamp = 0

			chartDataByPeggedAsset = peggedAssets.map((elem: PeggedAssetApi, i: number) => {
				peggedNameToChartDataIndex[elem.name] = i
				const charts = (breakdown[elem.id] ?? []) as Array<{ date: number; totalCirculatingUSD?: number }>
				const formattedCharts = charts
					.map((chart) => ({
						date: chart.date,
						mcap: chart.totalCirculatingUSD
					}))
					.filter((i) => i.mcap !== undefined)

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
			return filteredPeggedAssets.map((asset: FilteredPeggedAsset) => ({
				name: asset.name,
				symbol: asset.symbol,
				mcap: asset.mcap || 0,
				price: asset.price || 1,
				change_1d: asset.change_1d || 0,
				change_7d: asset.change_7d || 0,
				change_1m: asset.change_1m || 0,
				pegDeviation: asset.pegDeviation,
				chains: asset.chains || [],
				pegType: asset.pegType,
				gecko_id: asset.gecko_id
			}))
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 5 * 60 * 1000 // 5 minutes
	})
}
