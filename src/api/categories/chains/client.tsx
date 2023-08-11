import useSWR from 'swr'
import { getDexVolumeByChain } from '../dexs'
import { getFeesAndRevenueByChain, getFeesAndRevenueProtocolsByChain } from '../fees'

export function useGetProtocolsVolumeByChain(chain?: string) {
	const { data, error } = useSWR(
		`protocolsVolumeByChain/${chain}`,
		chain
			? () =>
					getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						(data) => data?.protocols ?? null
					)
			: () => null
	)

	return { data: data ?? null, loading: !data && data !== null && !error }
}

export function useGetVolumeChartDataByChain(chain?: string) {
	const { data, error } = useSWR(`volumeChartDataByChain/${chain}`, () =>
		getDexVolumeByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
			(data) => data?.totalDataChart ?? null
		)
	)

	return { data: data ?? null, loading: !data && data !== null && !error }
}

export function useGetFeesAndRevenueChartDataByChain(chain?: string) {
	const { data, error } = useSWR(
		`feesAndRevenueChartDataByChain/${chain}`,
		chain && chain !== 'All'
			? () =>
					getFeesAndRevenueByChain({ chain, excludeTotalDataChart: false, excludeTotalDataChartBreakdown: true }).then(
						({ fees, revenue }) => {
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
						}
					)
			: () => null
	)

	return { data: data ?? null, loading: !data && data !== null && !error }
}

export function useGetProtocolsFeesAndRevenueByChain(chain?: string) {
	const { data, error } = useSWR(
		`protocolsFeesAndRevenueByChain/${chain}`,
		chain ? () => getFeesAndRevenueProtocolsByChain({ chain }) : () => null
	)

	return { data, loading: !data && data !== null && !error }
}
