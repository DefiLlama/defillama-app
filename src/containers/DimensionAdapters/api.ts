import { V2_SERVER_URL } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

export async function getAdapterChainMetrics({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
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
	dataType?: `${ADAPTER_DATA_TYPES}`
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
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
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
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
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
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
	type: 'chain' | 'version'
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/protocol/${slug(protocol)}/${type}-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson(totalDataChartUrl, { timeout: 30_000 }) as Promise<Array<[number, Record<string, number>]>>
}

export async function getAdapterChainChartDataByProtocolBreakdown({
	adapterType,
	chain,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}`
}) {
	let totalDataChartUrl = `${V2_SERVER_URL}/chart/${adapterType}/chain/${slug(chain)}/protocol-breakdown`

	if (dataType) {
		totalDataChartUrl += `?dataType=${dataType}`
	}

	return fetchJson(totalDataChartUrl, { timeout: 30_000 }) as Promise<Array<[number, Record<string, number>]>>
}

export async function getCexVolume() {
	const [cexs, btcPriceRes] = await Promise.all([
		fetchJson(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		),
		fetchJson(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs || typeof cexs.filter !== 'function') return undefined
	return cexs.filter((c) => c.trust_score >= 9).reduce((sum, c) => sum + c.trade_volume_24h_btc, 0) * btcPrice
}
