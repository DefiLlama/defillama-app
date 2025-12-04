import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PEGGEDCHART_API, PEGGEDPRICES_API, PEGGEDRATES_API, PEGGEDS_API } from '~/constants'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { fetchJson } from '~/utils/async'
import { getDominancePercent, preparePieChartData } from '~/utils'

interface UseStablecoinsChartDataResult {
	peggedAreaTotalData: any[]
	peggedAreaChartData: any[]
	chainsCirculatingValues: any[]
	dataWithExtraPeggedAndDominanceByDay: any[]
	usdInflows: any[]
	tokenInflows: any[]
	tokenInflowNames: string[]
	peggedAssetNames: string[]
	totalMcapCurrent: number | null
	isLoading: boolean
	error: any
}

export function useStablecoinsChartData(chain: string): UseStablecoinsChartDataResult {
	const { data: rawData, isLoading, error } = useQuery({
		queryKey: ['stablecoins-chart-data', chain],
		queryFn: async () => {
			const [peggedData, chainData, priceData, rateData] = await Promise.all([
				fetchJson(PEGGEDS_API),
				fetchJson(`${PEGGEDCHART_API}/${chain === 'All' ? 'all-llama-app' : chain}`),
				fetchJson(PEGGEDPRICES_API),
				fetchJson(PEGGEDRATES_API)
			])

			const { peggedAssets } = peggedData
			const breakdown = chainData?.breakdown

			if (!breakdown) {
				return null
			}

			let chartDataByPeggedAsset: any[] = []
			let peggedNameToChartDataIndex: Record<string, number> = {}
			let lastTimestamp = 0

			chartDataByPeggedAsset = peggedAssets.map((elem: any, i: number) => {
				peggedNameToChartDataIndex[elem.name] = i
				const charts = breakdown[elem.id] ?? []
				const formattedCharts = charts
					.map((chart: any) => ({
						date: chart.date,
						mcap: chart.totalCirculatingUSD
					}))
					.filter((i: any) => i.mcap !== undefined)

				if (formattedCharts.length > 0) {
					lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
				}

				return formattedCharts
			})

			chartDataByPeggedAsset.forEach((chart: any) => {
				const last = chart[chart.length - 1]
				if (!last) return

				let lastDate = Number(last.date)
				while (lastDate < lastTimestamp) {
					lastDate += 24 * 3600
					chart.push({
						...last,
						date: lastDate
					})
				}
			})

			const peggedAssetNames = peggedAssets.map((p: any) => p.name)

			const filteredPeggedAssets = formatPeggedAssetsData({
				peggedAssets,
				chartDataByPeggedAsset,
				priceData,
				rateData,
				peggedNameToChartDataIndex,
				chain: chain === 'All' ? null : chain
			})

			const doublecountedIds: number[] = []
			peggedAssets.forEach((asset: any, idx: number) => {
				if (asset.doublecounted) {
					doublecountedIds.push(idx)
				}
			})

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
		const sorted = [...assets].sort((a: any, b: any) => (b.mcap || 0) - (a.mcap || 0))
		return preparePieChartData({ data: sorted, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [rawData?.filteredPeggedAssets])

	const dataWithExtraPeggedAndDominanceByDay = useMemo(() => {
		const stackedDataset = chartData.stackedDataset || []
		if (stackedDataset.length === 0) return []

		const daySum: Record<string, number> = {}
		stackedDataset.forEach(([date, values]: [string, any]) => {
			let totalDaySum = 0
			Object.values(values).forEach((chainCirculating: any) => {
				totalDaySum += chainCirculating?.circulating || 0
			})
			daySum[date] = totalDaySum
		})

		return stackedDataset.map(([date, values]: [string, any]) => {
			const shares: Record<string, number> = {}
			Object.entries(values).forEach(([name, chainCirculating]: [string, any]) => {
				const circulating = chainCirculating?.circulating || 0
				shares[name] = getDominancePercent(circulating, daySum[date]) || 0
			})
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
			const data = await fetchJson(PEGGEDS_API)
			const chains = data?.chains || []
			return chains
				.map((c: any) => {
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
