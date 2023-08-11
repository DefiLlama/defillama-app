import useSWR from 'swr'
import { BRIDGES_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { getBridgeOverviewPageData } from '.'

export const useFetchBridgeList = () => {
	const { data, error } = useSWR(BRIDGES_API, fetcher)
	return { data, error, loading: !data && !error }
}

export const useGetBridgeChartDataByChain = (chain?: string) => {
	const { data, error } = useSWR(
		`bridgeChartDataByChain/${chain}`,
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
			: () => null
	)

	return { data: data ?? null, error, loading: !data && data !== null && !error }
}
