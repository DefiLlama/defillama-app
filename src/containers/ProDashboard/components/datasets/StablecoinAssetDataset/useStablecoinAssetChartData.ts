import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import {
	fetchStablecoinAssetApi,
	fetchStablecoinAssetsApi,
	fetchStablecoinPeggedConfigApi
} from '~/containers/Stablecoins/api'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { getDominancePercent } from '~/utils'

interface UseStablecoinAssetChartDataResult {
	peggedAreaTotalData: any[]
	peggedAreaChartData: any[]
	chainsCirculatingValues: any[]
	dataWithExtraPeggedAndDominanceByDay: any[]
	chainsUnique: string[]
	stablecoinName: string
	stablecoinSymbol: string
	totalCirculating: number | null
	isLoading: boolean
	error: any
}

export function useStablecoinAssetChartData(stablecoinSlug: string): UseStablecoinAssetChartDataResult {
	const {
		data: rawData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['stablecoin-asset-chart-data', stablecoinSlug],
		queryFn: async () => {
			if (!stablecoinSlug) return null

			const peggedNameToPeggedIDMapping = await fetchStablecoinPeggedConfigApi()
			const peggedID = peggedNameToPeggedIDMapping[stablecoinSlug]
			if (!peggedID) {
				return null
			}

			const res = await fetchStablecoinAssetApi(peggedID)
			if (!res) {
				return null
			}

			const chainsUnique: string[] = Object.keys(res.chainBalances || {})

			const chainsData: any[] = chainsUnique.map((chain: string) => {
				return res.chainBalances[chain]?.tokens || []
			})
			const stablecoinName = typeof res.name === 'string' ? res.name : ''
			const stablecoinSymbol = typeof res.symbol === 'string' ? res.symbol : ''

			return {
				peggedAssetData: res,
				chainsUnique,
				chainsData,
				stablecoinName,
				stablecoinSymbol
			}
		},
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000,
		enabled: !!stablecoinSlug
	})

	const chartData = useMemo(() => {
		if (!rawData) {
			return {
				peggedAreaChartData: [],
				peggedAreaTotalData: [],
				stackedDataset: []
			}
		}

		const { chainsData, chainsUnique } = rawData
		const filteredIndexes = [...Array(chainsUnique.length).keys()]

		return buildStablecoinChartData({
			chartDataByAssetOrChain: chainsData,
			assetsOrChainsList: chainsUnique,
			filteredIndexes,
			issuanceType: 'circulating',
			selectedChain: undefined,
			totalChartTooltipLabel: 'Circulating'
		})
	}, [rawData])

	const chainsCirculatingValues = useMemo(() => {
		if (!rawData || !chartData.stackedDataset || chartData.stackedDataset.length === 0) {
			return []
		}

		const latestData = chartData.stackedDataset[chartData.stackedDataset.length - 1]
		if (!latestData) return []

		const [, values] = latestData
		const chainData = Object.entries(values).map(([name, data]: [string, any]) => ({
			name,
			circulating: data?.circulating || 0
		}))

		return preparePieChartData({ data: chainData, sliceIdentifier: 'name', sliceValue: 'circulating', limit: 10 })
	}, [rawData, chartData.stackedDataset])

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

	const totalCirculating: number | null = useMemo(() => {
		if (!chartData.peggedAreaTotalData || chartData.peggedAreaTotalData.length === 0) {
			return null
		}
		const lastEntry = chartData.peggedAreaTotalData[chartData.peggedAreaTotalData.length - 1]
		return typeof lastEntry?.Circulating === 'number' ? lastEntry.Circulating : null
	}, [chartData.peggedAreaTotalData])

	return useMemo(
		() => ({
			peggedAreaTotalData: chartData.peggedAreaTotalData || [],
			peggedAreaChartData: chartData.peggedAreaChartData || [],
			chainsCirculatingValues,
			dataWithExtraPeggedAndDominanceByDay,
			chainsUnique: rawData?.chainsUnique || [],
			stablecoinName: rawData?.stablecoinName || '',
			stablecoinSymbol: rawData?.stablecoinSymbol || '',
			totalCirculating,
			isLoading,
			error
		}),
		[
			chartData.peggedAreaTotalData,
			chartData.peggedAreaChartData,
			chainsCirculatingValues,
			dataWithExtraPeggedAndDominanceByDay,
			rawData?.chainsUnique,
			rawData?.stablecoinName,
			rawData?.stablecoinSymbol,
			totalCirculating,
			isLoading,
			error
		]
	)
}

export interface StablecoinAssetInfo {
	name: string
	symbol: string
	mcap: number
	geckoId: string
}

export function useStablecoinAssetsList() {
	return useQuery({
		queryKey: ['stablecoin-assets-list'],
		queryFn: async () => {
			const data = await fetchStablecoinAssetsApi()
			const peggedAssets = data?.peggedAssets || []
			return peggedAssets
				.map((asset: any) => {
					const mcap = asset.circulating?.peggedUSD || 0
					return {
						name: asset.name,
						symbol: asset.symbol,
						mcap,
						geckoId: asset.gecko_id
					}
				})
				.filter((a: StablecoinAssetInfo) => a.mcap > 0)
				.sort((a: StablecoinAssetInfo, b: StablecoinAssetInfo) => b.mcap - a.mcap)
		},
		staleTime: 60 * 60 * 1000
	})
}
