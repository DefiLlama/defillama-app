import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'

type StablecoinMcapSeriesPoint = [number, number]

const buildStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
	try {
		return fetchJson<StablecoinMcapSeriesPoint[]>(`/api/stablecoins/chart?chain=${encodeURIComponent(chain)}`)
	} catch (err) {
		console.log(err)
		return null
	}
}

export const useGetStabelcoinsChartDataByChain = (chain?: string) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['stablecoins', 'chart-by-chain', chain],
		queryFn: chain ? () => buildStablecoinMcapSeries(chain) : () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!chain
	})

	return { data: data ?? null, error, isLoading }
}
