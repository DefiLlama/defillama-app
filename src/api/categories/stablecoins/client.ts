import useSWR from 'swr'
import { PEGGEDS_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { getPeggedOverviewPageData } from '.'
import { buildPeggedChartData } from '~/utils/stablecoins'
import { getPeggedDominance, getPercentChange } from '~/utils'

export const useFetchPeggedList = () => {
	const { data, error } = useSWR(PEGGEDS_API, fetcher)
	return { data, error, loading: !data && !error }
}

export const useGetStabelcoinsChartDataByChain = (chain?: string) => {
	const { data, error } = useSWR(`stablecoinsChartDataByChain/${chain}`, () =>
		getPeggedOverviewPageData(chain === 'All' ? null : chain)
			.then((data) => {
				const { peggedAreaTotalData } = buildPeggedChartData(
					data?.chartDataByPeggedAsset,
					data?.peggedAssetNames,
					Object.values(data?.peggedNameToChartDataIndex || {}),
					'mcap',
					data?.chainTVLData,
					chain
				)

				return peggedAreaTotalData
			})
			.catch(() => null)
	)

	return { data: data ?? null, error, loading: !data && data !== null && !error }
}
