import { useQuery } from '@tanstack/react-query'
import { getBridgeOverviewPageData } from './queries.server'

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
