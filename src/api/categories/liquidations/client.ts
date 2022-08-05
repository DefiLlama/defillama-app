import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'
import { getCGMarketsDataURLs } from '~/api'
import { CONFIG_API, LIQUIDATIONS_CONFIG_API, LIQUIDATIONS_CHART_API } from '~/constants'

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

interface IResponseProjectSmolConfigAPI {
	id: string
	name: string
	address: string
	symbol: string
	url: string
	description: string
	chain: string
	logo: string
	gecko_id: string
	cmcId: string
	chains: string[]
	module: string
	twitter: string
}

export const useProjectConfigData = (project: string) => {
	const url = `${CONFIG_API}/smol/${project}`
	const { data, error } = useSWR<IResponseProjectSmolConfigAPI>(project ? url : null, fetcher)
	return { data, error, loading: !data && !error }
}

export const useFetchAssetsList = () => {
	const { data, error } = useSWR<IResponseCGMarketsAPI[]>(
		'liquidations-api',
		() => arrayFetcher(getCGMarketsDataURLs()),
		{
			onErrorRetry: retrySWR
		}
	)

	return {
		data: data?.flat(),
		error,
		loading: !data && !error
	}
}

export const useLiquidationsPageData = () => {
	const { data, error } = useSWR('/liquidations-data', () =>
		arrayFetcher([LIQUIDATIONS_CHART_API, LIQUIDATIONS_CONFIG_API])
	)

	return {
		data,
		error,
		loading: !data && !error
	}
}
