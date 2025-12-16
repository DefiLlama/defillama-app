import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PEGGED_API, PEGGEDCONFIG_API, PEGGEDS_API } from '~/constants'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { getDominancePercent, preparePieChartData, slug } from '~/utils'
import { fetchJson } from '~/utils/async'

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

			const peggedNameToPeggedIDMapping = await fetchJson(PEGGEDCONFIG_API)
			const peggedID = peggedNameToPeggedIDMapping[stablecoinSlug]
			if (!peggedID) {
				return null
			}

			const res = await fetchJson(`${PEGGED_API}/${peggedID}`)
			if (!res) return null

			const chainsUnique: string[] = Object.keys(res.chainBalances || {})

			const chainsData: any[] = chainsUnique.map((chain: string) => {
				return res.chainBalances[chain]?.tokens || []
			})

			return {
				peggedAssetData: res,
				chainsUnique,
				chainsData,
				stablecoinName: res.name,
				stablecoinSymbol: res.symbol
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
			const data = await fetchJson(PEGGEDS_API)
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
