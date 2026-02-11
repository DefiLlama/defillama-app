import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

type CexExchange = {
	trust_score?: number
	trade_volume_24h_btc?: number
}

export async function getAdapterChainMetrics({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings' | undefined
}) {
	let metricsUrl = `${V2_SERVER_URL}/metrics/${adapterType}${chain && chain !== 'All' ? `/chain/${slug(chain)}` : ''}`

	if (dataType) {
		metricsUrl += `?dataType=${dataType}`
	}

	return fetchJson(metricsUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolMetrics({
	adapterType,
	protocol,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}` | undefined
}) {
	let metricsUrl = `${V2_SERVER_URL}/metrics/${adapterType}/protocol/${slug(protocol)}`

	if (dataType) {
		metricsUrl += `?dataType=${dataType}`
	}

	return fetchJson(metricsUrl, { timeout: 30_000 })
}

export async function getAdapterChainChartData({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings' | undefined
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}${chain && chain !== 'All' ? `/chain/${slug(chain)}` : ''}`

	if (dataType === 'dailyEarnings') {
		// earnings do not filter by chain at fetch time
		totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}`
	}

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolChartData({
	adapterType,
	protocol,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings' | undefined
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol/${slug(protocol)}`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterProtocolChartDataByBreakdownType({
	adapterType,
	protocol,
	dataType,
	type
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings' | undefined
	type: 'chain' | 'version'
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol/${slug(protocol)}/${type}-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<Array<[number, Record<string, number>]>>(totalDataChartUrl, { timeout: 30_000 })
}

export async function getAdapterChainChartDataByProtocolBreakdown({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | undefined
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/chain/${slug(chain)}/protocol-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson<Array<[number, Record<string, number>]>>(totalDataChartUrl, { timeout: 30_000 })
}

export async function getCexVolume() {
	const [cexs, btcPriceRes] = await Promise.all([
		fetchJson<CexExchange[]>(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		),
		fetchJson<{ bitcoin?: { usd?: number } }>(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs || typeof cexs.filter !== 'function') return undefined
	return (
		cexs.filter((cex) => (cex.trust_score ?? 0) >= 9).reduce((sum, cex) => sum + (cex.trade_volume_24h_btc ?? 0), 0) *
		btcPrice
	)
}
