import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type {
	IAdapterChainMetrics,
	IAdapterChart,
	IAdapterProtocolMetrics,
	IAdapterBreakdownChartData
} from './api.types'
import { ADAPTER_TYPES, ADAPTER_DATA_TYPES } from './constants'

export async function getAdapterChainMetrics({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
}): Promise<IAdapterChainMetrics> {
	let metricsUrl = `${V2_SERVER_URL}/metrics/${adapterType}${chain && chain !== 'All' ? `/chain/${slug(chain)}` : ''}`

	if (dataType) {
		metricsUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterChainMetrics>(metricsUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolMetrics({
	adapterType,
	protocol,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}`
}): Promise<IAdapterProtocolMetrics> {
	let metricsUrl = `${V2_SERVER_URL}/metrics/${adapterType}/protocol/${slug(protocol)}`

	if (dataType) {
		metricsUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterProtocolMetrics>(metricsUrl, { timeout: 30_000 })
}

export async function getAdapterChainChartData({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
}): Promise<IAdapterChart> {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}${chain && chain !== 'All' ? `/chain/${slug(chain)}` : ''}`

	if (dataType === 'dailyEarnings') {
		// earnings do not filter by chain at fetch time
		totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}`
	}

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterChart>(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolChartData({
	adapterType,
	protocol,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
}): Promise<IAdapterChart> {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol/${slug(protocol)}`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterChart>(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolChartDataByBreakdownType({
	adapterType,
	protocol,
	dataType,
	type
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
	type: 'chain' | 'version'
}): Promise<IAdapterBreakdownChartData> {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol/${slug(protocol)}/${type}-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterBreakdownChartData>(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterChainChartDataByProtocolBreakdown({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}`
}): Promise<IAdapterBreakdownChartData> {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/chain/${slug(chain)}/protocol-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<IAdapterBreakdownChartData>(totalDataChartUrl, { timeout: 30_000 })
}

interface CoinGeckoExchange {
	trust_score: number
	trade_volume_24h_btc: number
}

interface CoinGeckoBtcPrice {
	bitcoin: {
		usd: number
	}
}

export async function getCexVolume(): Promise<number | undefined> {
	const [cexs, btcPriceRes] = await Promise.all([
		fetchJson<CoinGeckoExchange[]>(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		),
		fetchJson<CoinGeckoBtcPrice>(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs) return undefined
	return cexs.filter((c) => c.trust_score >= 9).reduce((sum, c) => sum + c.trade_volume_24h_btc, 0) * btcPrice
}
