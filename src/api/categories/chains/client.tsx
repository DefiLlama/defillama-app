import { getDexVolumeByChain } from '../dexs'
import { getFeesAndRevenueByChain, getFeesAndRevenueProtocolsByChain } from '../fees'
import { getOverview } from '../adaptors'
import { CHAINS_ASSETS_CHART } from '~/constants'
import { useQuery } from '@tanstack/react-query'

export function useGetProtocolsVolumeByChain(chain?: string) {
	return useQuery({
		queryKey: [`protocolsVolumeByChain/${chain}`],
		queryFn: chain
			? () =>
					getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => data?.protocols ?? null
					)
			: () => null
	})
}

export function useGetVolumeChartDataByChain(chain?: string) {
	return useQuery({
		queryKey: [`volumeChartDataByChain/${chain}`],
		queryFn: chain
			? () =>
					getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => data?.totalDataChart ?? null
					)
			: () => null
	})
}

export function useGetFeesAndRevenueChartDataByChain(chain?: string) {
	return useQuery({
		queryKey: [`feesAndRevenueChartDataByChain/${chain}`],
		queryFn:
			chain && chain !== 'All'
				? () =>
						getFeesAndRevenueByChain({
							chain,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						}).then(({ fees, revenue }) => {
							const chart: { [date: number]: { fees: number | null; revenue: number | null } } = {}

							fees.totalDataChart?.forEach(([date, fees]) => {
								if (!chart[date]) {
									chart[date] = { fees: null, revenue: null }
								}

								chart[date]['fees'] = fees
							})

							revenue.totalDataChart?.forEach(([date, revenue]) => {
								if (!chart[date]) {
									chart[date] = { fees: null, revenue: null }
								}

								chart[date]['revenue'] = revenue
							})

							return Object.entries(chart).map(([date, { fees, revenue }]) => [+date, fees, revenue]) as Array<
								[number, number, number]
							>
						})
				: () => null
	})
}

export function useGetProtocolsFeesAndRevenueByChain(chain?: string) {
	return useQuery({
		queryKey: [`protocolsFeesAndRevenueByChain/${chain}`],
		queryFn: chain ? () => getFeesAndRevenueProtocolsByChain({ chain }) : () => null
	})
}

export const useGetItemOverviewByChain = (chain?: string, item?: string) => {
	return useQuery({
		queryKey: [`itemOverviewByChain/${chain}/${item}`],
		queryFn: chain ? () => getOverview(item, chain?.toLowerCase(), undefined, true, true) : () => null
	})
}

export const useGetChainAssetsChart = (chain?: string) => {
	const { data, isLoading } = useQuery({
		queryKey: [`chainAssetsChart/${chain}`],
		queryFn:
			chain && chain !== 'All'
				? () => fetch(`${CHAINS_ASSETS_CHART}/${chain?.toLowerCase()}`).then((r) => r.json())
				: () => null
	})

	return { data: !Array.isArray(data) ? undefined : data, isLoading }
}
