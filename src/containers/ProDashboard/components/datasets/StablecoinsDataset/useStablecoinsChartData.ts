import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { PEGGEDCHART_API, PEGGEDPRICES_API, PEGGEDRATES_API, PEGGEDS_API } from '~/constants'
import type { PeggedAssetApi, PeggedAssetsApiResponse } from '~/containers/Stablecoins/api.types'
import {
	type FilteredPeggedAsset,
	type IStablecoinStackedPoint,
	type IStablecoinStackedValue,
	buildStablecoinChartData,
	formatPeggedAssetsData
} from '~/containers/Stablecoins/utils'
import { getDominancePercent } from '~/utils'
import { fetchJson } from '~/utils/async'

interface UseStablecoinsChartDataResult {
	peggedAreaTotalData: Array<Record<string, number | string>>
	peggedAreaChartData: Array<Record<string, number | string>>
	chainsCirculatingValues: Array<{ name: string; value: number }>
	dataWithExtraPeggedAndDominanceByDay: Array<Record<string, number | string>>
	usdInflows: Array<[string | number, number]>
	tokenInflows: Array<Record<string, number | string>>
	tokenInflowNames: string[]
	peggedAssetNames: string[]
	totalMcapCurrent: number | null
	isLoading: boolean
	error: Error | null
}

export function useStablecoinsChartData(chain: string): UseStablecoinsChartDataResult {
	const {
		data: rawData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['stablecoins-chart-data', chain],
		queryFn: async () => {
			const [peggedData, chainData, priceData, rateData] = await Promise.all([
				fetchJson<PeggedAssetsApiResponse>(PEGGEDS_API),
				fetchJson<{ breakdown?: Record<string, Array<{ date: number; totalCirculatingUSD?: number }>> }>(
					`${PEGGEDCHART_API}/${chain === 'All' ? 'all-llama-app' : chain}`
				),
				fetchJson(PEGGEDPRICES_API),
				fetchJson(PEGGEDRATES_API)
			])

			const { peggedAssets } = peggedData
			const breakdown = chainData?.breakdown

			if (!breakdown) {
				return null
			}

			let chartDataByPeggedAsset: Array<Array<{ date: number; mcap: number | undefined }>> = []
			let peggedNameToChartDataIndex: Record<string, number> = {}
			let lastTimestamp = 0

			chartDataByPeggedAsset = peggedAssets.map((elem: PeggedAssetApi, i: number) => {
				peggedNameToChartDataIndex[elem.name] = i
				const charts = breakdown[elem.id] ?? []
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

			const peggedAssetNames = peggedAssets.map((p) => p.name)

			const filteredPeggedAssets = formatPeggedAssetsData({
				peggedAssets,
				chartDataByPeggedAsset,
				priceData,
				rateData,
				peggedNameToChartDataIndex,
				chain: chain === 'All' ? null : chain
			})

			const doublecountedIds: number[] = []
			for (let idx = 0; idx < peggedAssets.length; idx++) {
				const asset = peggedAssets[idx]
				if (asset.doublecounted) {
					doublecountedIds.push(idx)
				}
			}

			return {
				chartDataByPeggedAsset,
				peggedAssetNames,
				peggedNameToChartDataIndex,
				filteredPeggedAssets,
				doublecountedIds
			}
		},
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})

	const chartData = useMemo(() => {
		if (!rawData) {
			return {
				peggedAreaChartData: [],
				peggedAreaTotalData: [],
				stackedDataset: [],
				tokenInflows: [],
				tokenInflowNames: [],
				usdInflows: []
			}
		}

		const filteredIndexes = Object.values(rawData.peggedNameToChartDataIndex) as number[]

		return buildStablecoinChartData({
			chartDataByAssetOrChain: rawData.chartDataByPeggedAsset,
			assetsOrChainsList: rawData.peggedAssetNames,
			filteredIndexes,
			issuanceType: 'mcap',
			selectedChain: chain,
			doublecountedIds: rawData.doublecountedIds
		})
	}, [rawData, chain])

	const chainsCirculatingValues = useMemo(() => {
		const assets = rawData?.filteredPeggedAssets || []
		const sorted = [...assets].sort((a: FilteredPeggedAsset, b: FilteredPeggedAsset) => (b.mcap || 0) - (a.mcap || 0))
		return preparePieChartData({ data: sorted, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [rawData?.filteredPeggedAssets])

	const dataWithExtraPeggedAndDominanceByDay = useMemo(() => {
		const stackedDataset = chartData.stackedDataset || []
		if (stackedDataset.length === 0) return []

		const daySum: Record<string, number> = {}
		for (const entry of stackedDataset as IStablecoinStackedPoint[]) {
			const date = entry[0]
			const values = entry[1]
			let totalDaySum = 0
			for (const chainCirculating of Object.values(values)) {
				totalDaySum += chainCirculating?.circulating || 0
			}
			daySum[date] = totalDaySum
		}

		return (stackedDataset as IStablecoinStackedPoint[]).map(([date, values]) => {
			const shares: Record<string, number> = {}
			for (const name in values) {
				const chainCirculating: IStablecoinStackedValue = values[name]
				const circulating = chainCirculating?.circulating || 0
				shares[name] = getDominancePercent(circulating, daySum[date]) || 0
			}
			return { date, ...shares }
		})
	}, [chartData.stackedDataset])

	const totalMcapCurrent: number | null = useMemo(() => {
		if (!chartData.peggedAreaTotalData || chartData.peggedAreaTotalData.length === 0) {
			return null
		}
		const lastEntry = chartData.peggedAreaTotalData[chartData.peggedAreaTotalData.length - 1]
		return typeof lastEntry?.Mcap === 'number' ? lastEntry.Mcap : null
	}, [chartData.peggedAreaTotalData])

	return useMemo(
		() => ({
			peggedAreaTotalData: chartData.peggedAreaTotalData || [],
			peggedAreaChartData: chartData.peggedAreaChartData || [],
			chainsCirculatingValues,
			dataWithExtraPeggedAndDominanceByDay,
			usdInflows: chartData.usdInflows || [],
			tokenInflows: chartData.tokenInflows || [],
			tokenInflowNames: chartData.tokenInflowNames || [],
			peggedAssetNames: rawData?.peggedAssetNames || [],
			totalMcapCurrent,
			isLoading,
			error
		}),
		[
			chartData.peggedAreaTotalData,
			chartData.peggedAreaChartData,
			chartData.usdInflows,
			chartData.tokenInflows,
			chartData.tokenInflowNames,
			chainsCirculatingValues,
			dataWithExtraPeggedAndDominanceByDay,
			rawData?.peggedAssetNames,
			totalMcapCurrent,
			isLoading,
			error
		]
	)
}

export interface StablecoinChainInfo {
	name: string
	tvl: number
}

export function useStablecoinChainsList() {
	return useQuery({
		queryKey: ['stablecoin-chains-list'],
		queryFn: async () => {
			const data = await fetchJson<PeggedAssetsApiResponse>(PEGGEDS_API)
			const chains = data?.chains || []
			return chains
				.map((c) => {
					let tvl = 0
					if (c.totalCirculatingUSD) {
						const values = Object.values(c.totalCirculatingUSD) as number[]
						tvl = values.reduce((sum, val) => sum + (Number(val) || 0), 0)
					}
					return {
						name: c.name,
						tvl
					}
				})
				.sort((a: StablecoinChainInfo, b: StablecoinChainInfo) => b.tvl - a.tvl)
		},
		staleTime: 60 * 60 * 1000
	})
}
