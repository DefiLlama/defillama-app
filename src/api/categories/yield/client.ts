import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'
import { getCGMarketsDataURLs } from '~/api'
import {
	CONFIG_API,
	YIELD_CONFIG_API,
	YIELD_CHART_API,
	YIELD_POOLS_API,
	YIELD_POOLS_LAMBDA_API,
	YIELD_CHART_LEND_BORROW_API
} from '~/constants'
import { formatYieldsPageData } from './utils'

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

// single pool
export const useYieldPoolData = (configID) => {
	const url = `${YIELD_POOLS_LAMBDA_API}?pool=${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

// single pool chart data
export const useYieldChartData = (configID) => {
	const url = `${YIELD_CHART_API}/${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}
export const useYieldChartLendBorrow = (configID) => {
	const url = `${YIELD_CHART_LEND_BORROW_API}/${configID}`
	const { data, error } = useSWR(configID ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

// single pool config data
export const useYieldConfigData = (project) => {
	const url = `${CONFIG_API}/smol/${project}`
	const { data, error } = useSWR(project ? url : null, fetcher)
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

export const useYieldPageData = () => {
	const { data, error } = useSWR('/pools-and-config', () => arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API]))

	return {
		data,
		error,
		loading: !data && !error
	}
}

export const useFetchProjectsList = () => {
	const { data, error } = useSWR('/pools-and-config', () => arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API]))

	const { projectList } = data ? formatYieldsPageData(data) : { projectList: [] }

	return {
		data: projectList,
		error,
		loading: !data && !error
	}
}

export const useYields = () => {
	const { data = {} } = useSWR(YIELD_POOLS_API, fetcher)

	const res = data?.data

	return { data: res }
}
