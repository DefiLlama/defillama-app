import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'
import { getCGMarketsDataURLs } from '~/api'
import { YIELD_CHART_API, YIELD_POOLS_API } from '~/constants'

interface IResponseCGMarketsAPI {
	ath: number
	ath_change_percentage: number
	ath_date: string
	atl: number
	atl_change_percentage: number
	atl_date: string
	circulating_supply: number
	current_price: number
	fully_diluted_valuation: number
	high_24h: number
	id: string
	image: string
	last_updated: string
	low_24h: number
	market_cap: number
	market_cap_change_24h: number
	market_cap_change_percentage_24h: number
	market_cap_rank: number
	max_supply: number
	name: string
	price_change_24h: number
	price_change_percentage_24h: number
	roi: null
	symbol: string
	total_supply: number
	total_volume: number
}

// all unique pools
export const useYieldPoolsData = () => {
	const { data, error } = useSWR(YIELD_POOLS_API, fetcher)
	return { data, error, loading: !data && !error }
}
// single pool
export const useYieldPoolData = (poolId) => {
	const url = `${YIELD_POOLS_API}?pool=${poolId}`
	const { data, error } = useSWR(poolId ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

// single pool chart data
export const useYieldChartData = (poolId) => {
	const url = `${YIELD_CHART_API}/${poolId}`
	const { data, error } = useSWR(poolId ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}
export const useFetchYieldsList = () => {
	const { data, error } = useSWR<IResponseCGMarketsAPI[]>('yield-api', () => arrayFetcher(getCGMarketsDataURLs()), {
		onErrorRetry: retrySWR
	})

	return {
		data: data?.flat(),
		error,
		loading: !data && !error
	}
}
