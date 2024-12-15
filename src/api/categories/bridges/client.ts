import { BRIDGES_API, BRIDGEVOLUME_API } from '~/constants'
import { fetchApi } from '~/utils/async'
import { getBridgeOverviewPageData } from '.'
import { useQuery } from '@tanstack/react-query'

export const useFetchBridgeList = () => {
	return useQuery({ queryKey: [BRIDGES_API], queryFn: () => fetchApi(BRIDGES_API) })
}

export const useGetBridgeChartDataByChain = (chain?: string) => {
	return useQuery({
		queryKey: [`bridgeChartDataByChain/${chain}`],
		queryFn:
			chain && chain !== 'All'
				? () =>
						getBridgeOverviewPageData(chain)
							.catch(() => null)
							.then((data) =>
								data
									? data?.chainVolumeData?.map((volume) => [
											volume?.date ?? null,
											volume?.Deposits ?? null,
											volume.Withdrawals ?? null
									  ])
									: null
							)
							.catch((err) => {
								console.log(err)
								return null
							})
				: () => null,
		staleTime: 60 * 60 * 1000
	})
}

export const useFetchBridgeVolume = (chain: string = 'all') => {
	return useQuery({
		queryKey: ['bridgeVolume', chain],
		queryFn: () => fetch(`${BRIDGEVOLUME_API}/${chain}`).then((res) => res.json()),
		staleTime: 60 * 60 * 1000
	})
}
