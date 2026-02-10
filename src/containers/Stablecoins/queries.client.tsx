import { useQuery } from '@tanstack/react-query'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'

type StablecoinMcapSeriesPoint = [number, number]

const buildStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
	try {
		const data = await getStablecoinsByChainPageData(chain === 'All' ? null : chain)
		const { peggedAreaTotalData } = buildStablecoinChartData({
			chartDataByAssetOrChain: data.chartDataByPeggedAsset,
			assetsOrChainsList: data.peggedAssetNames,
			filteredIndexes: Object.values(data.peggedNameToChartDataIndex),
			issuanceType: 'mcap',
			selectedChain: chain,
			doublecountedIds: data.doublecountedIds
		})

		return peggedAreaTotalData
			.map(({ date, Mcap }): StablecoinMcapSeriesPoint | null => {
				const timestamp = Number(date) * 1e3
				if (!Number.isFinite(timestamp) || !Number.isFinite(Mcap)) return null
				return [timestamp, Mcap]
			})
			.filter((point): point is StablecoinMcapSeriesPoint => point !== null)
	} catch (err) {
		console.log(err)
		return null
	}
}

export const useGetStabelcoinsChartDataByChain = (chain?: string) => {
	const { data, isLoading, error } = useQuery({
		queryKey: [`stablecoinsChartDataByChain/${chain}`],
		queryFn: chain ? () => buildStablecoinMcapSeries(chain) : () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!chain
	})

	return { data: data ?? null, error, isLoading }
}
