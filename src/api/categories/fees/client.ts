import useSWR from 'swr'
import { FEES_BASE_API } from '~/constants'
import { mapProtocolName } from '~/pages/fees.deprecated/[protocol]'
import { capitalizeFirstLetter } from '~/utils'
import { fetcher } from '~/utils/useSWR'

export const useFetchProtocolFees = (protocolName) => {
	const { data, error } = useSWR(`${FEES_BASE_API}/${mapProtocolName(protocolName)}`, fetcher)

	const chartData = {}
	if (data && data.feesHistory && data.revenueHistory) {
		data.feesHistory.forEach((item) => {
			if (!chartData[item.timestamp]) {
				chartData[item.timestamp] = {}
			}

			chartData[item.timestamp] = {
				...chartData[item.timestamp],
				Fees: Object.values(item.dailyFees).reduce(
					(sum: number, curr: number) =>
						Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum,
					0
				)
			}
		})

		data.revenueHistory.forEach((item) => {
			if (!chartData[item.timestamp]) {
				chartData[item.timestamp] = {}
			}

			chartData[item.timestamp] = {
				...chartData[item.timestamp],
				Revenue: Object.values(item.dailyRevenue).reduce(
					(sum: number, curr: number) =>
						Object.values(curr).reduce((item1: number, item2: number) => item1 + item2, 0) + sum,
					0
				)
			}
		})
	}

	const res = {
		data: { ...(data || {}), name: capitalizeFirstLetter(mapProtocolName(protocolName)) },
		chartData: Object.keys(chartData).map((date) => ({ date, ...chartData[date] }))
	}

	const loading = !res?.chartData?.length

	return { data: res, loading, error }
}
