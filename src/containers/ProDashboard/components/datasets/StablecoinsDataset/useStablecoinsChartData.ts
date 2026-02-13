import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import {
	fetchStablecoinAssetsApi,
	fetchStablecoinChartApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi
} from '~/containers/Stablecoins/api'
import { buildStablecoinChartData, formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { getDominancePercent } from '~/utils'

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
	const {
		data: rawData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['stablecoins-chart-data', chain],
		queryFn: async () => {
			const [peggedData, chainData, priceData, rateData] = await Promise.all([
				fetchStablecoinAssetsApi(),
				fetchStablecoinChartApi(chain === 'All' ? 'all-llama-app' : chain),
				fetchStablecoinPricesApi(),
				fetchStablecoinRatesApi()
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
			for (let idx = 0; idx < peggedAssets.length; idx++) {
				const asset = peggedAssets[idx]
				if ((asset as unknown as { doublecounted?: boolean }).doublecounted) {
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
		const sorted = [...assets].sort((a: any, b: any) => (b.mcap || 0) - (a.mcap || 0))
		return preparePieChartData({ data: sorted, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [rawData?.filteredPeggedAssets])

	const dataWithExtraPeggedAndDominanceByDay = useMemo(() => {
		const stackedDataset = chartData.stackedDataset || []
		if (stackedDataset.length === 0) return []

		const daySum: Record<string, number> = {}
		for (const entry of stackedDataset as [string, any][]) {
			const date = entry[0]
			const values = entry[1]
			let totalDaySum = 0
			for (const chainCirculating of Object.values(values) as any[]) {
				totalDaySum += chainCirculating?.circulating || 0
			}
			daySum[date] = totalDaySum
		}

		return stackedDataset.map(([date, values]: [string, any]) => {
			const shares: Record<string, number> = {}
			for (const name in values) {
				const chainCirculating = values[name] as any
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
			const data = await fetchStablecoinAssetsApi()
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
