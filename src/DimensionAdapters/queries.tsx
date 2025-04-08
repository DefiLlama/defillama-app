import { BASE_API, DIMENISIONS_OVERVIEW_API } from '~/constants'
import { fetchWithErrorLogging, postRuntimeLogs } from '~/utils/async'
import { slug } from '~/utils'
import { ADAPTOR_TYPES } from './constants'

const fetch = fetchWithErrorLogging

export interface IAdapterOverview {
	totalDataChart: Array<[number, number]> // date, value
	totalDataChartBreakdown: Array<[number, Record<string, number>]> // date , {chain: value}
	breakdown24h: number | null
	chain: string | null
	allChains: Array<string>
	total24h: number
	total48hto24h: number
	total7d: number
	total14dto7d: number
	total60dto30d: number
	total30d: number
	total1y: number
	change_1d: number
	change_7d: number
	change_1m: number
	change_7dover7d: number
	change_30dover30d: number
	total7DaysAgo: number
	total30DaysAgo: number
	protocols: Array<{
		total24h: number
		total48hto24h: number
		total7d: number
		total14dto7d: number
		total60dto30d: number
		total30d: number
		total1y: number
		totalAllTime: number
		average1y: number
		change_1d: number
		change_7d: number
		change_1m: number
		change_7dover7d: number
		change_30dover30d: number
		breakdown24h: Record<string, Record<string, number>>
		breakdown30d: Record<string, Record<string, number>>
		total7DaysAgo: number
		total30DaysAgo: number
		defillamaId: string
		name: string
		displayName: string
		module: string
		category: string
		logo: string
		chains: Array<string>
		protocolType: string
		methodologyURL: string
		methodology: Record<string, string>
		latestFetchIsOk: boolean
		parentProtocol: string
		slug: string
		linkedProtocols: Array<string>
		id: string
	}>
}

export async function getAdapterOverview({
	type,
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown,
	dataType
}: {
	type: `${ADAPTOR_TYPES}`
	chain: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
	dataType?: string
}) {
	let url = `${DIMENISIONS_OVERVIEW_API}/${type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type}${
		chain && chain !== 'All' ? `/${slug(chain)}` : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	if (dataType) {
		url += `?dataType=${dataType}`
	}

	const data = await fetchWithErrorLogging(url).then(handleFetchResponse)

	return data as IAdapterOverview
}

export async function getCexVolume() {
	const [cexs, btcPriceRes] = await Promise.all([
		fetch(
			`${BASE_API}cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		).then(handleFetchResponse),
		fetch(
			`${BASE_API}cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		).then(handleFetchResponse)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs || typeof cexs.filter !== 'function') return undefined
	// cexs might not be a list TypeError: cexs.filter is not a function
	const volume = cexs.filter((c) => c.trust_score >= 9).reduce((sum, c) => sum + c.trade_volume_24h_btc, 0) * btcPrice
	return volume
}

async function handleFetchResponse(res: Response) {
	try {
		const response = await res.json()
		return response
	} catch (e) {
		postRuntimeLogs(
			`Failed to parse response from ${res.url}, with status ${res.status} and error message ${e.message}`
		)
		return {}
	}
}
