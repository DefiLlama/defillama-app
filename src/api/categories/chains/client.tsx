import {
	getOverview,
	getDexVolumeByChain,
	getAppRevenueByChain,
	getAppFeesByChain,
	getFeesAndRevenueByChain,
	getFeesAndRevenueProtocolsByChain
} from '../adaptors'
import { useQuery } from '@tanstack/react-query'

export function useGetProtocolsVolumeByChain(chain?: string) {
	return useQuery({
		queryKey: [`protocolsVolumeByChain/${chain}`],
		queryFn: chain
			? () =>
					getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => data?.protocols ?? null
					)
			: () => null,
		staleTime: 60 * 60 * 1000
	})
}

export function useGetProtocolsFeesAndRevenueByChain(chain?: string) {
	return useQuery({
		queryKey: [`protocolsFeesAndRevenueByChain/${chain}`],
		queryFn: chain ? () => getFeesAndRevenueProtocolsByChain({ chain }) : () => null,
		staleTime: 60 * 60 * 1000
	})
}
