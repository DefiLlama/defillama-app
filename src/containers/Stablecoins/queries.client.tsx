import { PEGGEDS_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { getPeggedOverviewPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { useQuery } from '@tanstack/react-query'

export const useFetchStablecoinsList = ({ disabled }: { disabled?: boolean }) => {
	return useQuery({
		queryKey: [PEGGEDS_API, disabled],
		queryFn: () => fetchApi(PEGGEDS_API),
		staleTime: 60 * 60 * 1000,
		enabled: !disabled
	})
}

export const useGetStabelcoinsChartDataByChain = (chain?: string) => {
	const { data, isLoading, error } = useQuery({
		queryKey: [`stablecoinsChartDataByChain/${chain}`],
		queryFn: chain
			? () =>
					getPeggedOverviewPageData(chain === 'All' ? null : chain)
						.then((data) => {
							const { peggedAreaTotalData } = buildStablecoinChartData({
								chartDataByAssetOrChain: data?.chartDataByPeggedAsset,
								assetsOrChainsList: data?.peggedAssetNames,
								filteredIndexes: Object.values(data?.peggedNameToChartDataIndex || {}),
								issuanceType: 'mcap',
								selectedChain: chain,
								doublecountedIds: data?.doublecountedIds
							})

							const finalData = []
							for (const { date, Mcap } of peggedAreaTotalData) {
								finalData.push([+date * 1e3, Mcap])
							}

							return finalData
						})
						.catch((err) => {
							console.log(err)
							return null
						})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: !!chain
	})

	return { data: data ?? null, error, isLoading }
}
