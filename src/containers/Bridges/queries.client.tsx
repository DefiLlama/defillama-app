import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

export const useGetBridgeChartDataByChain = (chain?: string) => {
	return useQuery({
		queryKey: ['bridges', 'chart-by-chain', chain],
		queryFn:
			chain && chain !== 'All'
				? () =>
						fetchJson<Array<[number | null, number | null, number | null]> | null>(
							`/api/charts/chain?kind=net-inflows&chain=${encodeURIComponent(chain)}`
						).catch((err) => {
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
