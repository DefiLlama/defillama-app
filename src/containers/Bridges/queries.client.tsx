import { useQuery } from '@tanstack/react-query'
import { BRIDGES_API, BRIDGEVOLUME_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { getBridgeOverviewPageData } from './queries.server'

// oxlint-disable-next-line no-unused-vars
const useFetchBridgeList = () => {
	return useQuery({ queryKey: [BRIDGES_API], queryFn: () => fetchJson(BRIDGES_API) })
}

export const useGetBridgeChartDataByChain = (chain?: string) => {
	return useQuery({
		queryKey: ['bridges', 'chart-by-chain', chain],
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
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!chain
	})
}

export const useFetchBridgeVolume = (chain: string = 'all') => {
	return useQuery({
		queryKey: ['bridges', 'volume', chain],
		queryFn: () => fetchJson(`${BRIDGEVOLUME_API}/${chain}`),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
}
