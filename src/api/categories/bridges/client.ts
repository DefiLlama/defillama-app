import useSWR from 'swr'
import { BRIDGES_API } from '~/constants'
import { fetcher } from '~/utils/useSWR'
import { getBridgeOverviewPageData } from '.'

export const useFetchBridgeList = () => {
	const { data, error } = useSWR(BRIDGES_API, fetcher)
	return { data, error, loading: !data && !error }
}

export async function getBridgeChartDataByChain({ chain }) {
	const data = await getBridgeOverviewPageData(chain)
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

	return data
}

export const useGetBridgeChartDataByChain = (chain?: string) => {
	const { data, error } = useSWR(
		`bridgeChartDataByChain/${chain}`,
		chain && chain !== 'All' ? () => getBridgeChartDataByChain({ chain }) : () => null
	)

	return { data: data ?? null, error, loading: !data && data !== null && !error }
}
