import { CACHE_SERVER, CHART_API, DIMENSIONS_OVERVIEW_API, DIMENSIONS_SUMMARY_API } from '~/constants'
import { fetchChainAssetsChart } from '~/containers/BridgedTVL/api'
import {
	ONCHAIN_ADDRESSES_API,
	ONCHAIN_GAS_API,
	ONCHAIN_NEW_ADDRESSES_API,
	ONCHAIN_TXS_API
} from '~/containers/OnchainUsersAndTxs/api'
import { fetchStablecoinChartApi } from '~/containers/Stablecoins/api'
import { toDisplayName } from '~/utils/chainNormalizer'
import { processAdjustedTvl } from '~/utils/tvl'
import { convertToNumberFormat, normalizeHourlyToDaily } from '../utils'

const CHART_METADATA = {
	tvl: { type: 'tvl' },

	volume: { type: 'dimensions', endpoint: 'dexs' },
	fees: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyAppFees' },
	revenue: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyAppRevenue' },
	bribes: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyBribesRevenue' },
	tokenTax: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyTokenTaxes' },
	aggregators: { type: 'dimensions', endpoint: 'aggregators' },
	perps: { type: 'dimensions', endpoint: 'derivatives' },
	bridgeAggregators: { type: 'dimensions', endpoint: 'bridge-aggregators' },
	perpsAggregators: { type: 'dimensions', endpoint: 'aggregator-derivatives' },
	options: { type: 'dimensions', endpoint: 'options' },

	chainFees: { type: 'protocol', endpoint: 'fees' },
	chainRevenue: { type: 'protocol', endpoint: 'fees', dataType: 'dailyRevenue' },

	users: { type: 'userMetrics', api: ONCHAIN_ADDRESSES_API },
	activeUsers: { type: 'userMetrics', api: ONCHAIN_ADDRESSES_API },
	newUsers: { type: 'userMetrics', api: ONCHAIN_NEW_ADDRESSES_API },
	txs: { type: 'userMetrics', api: ONCHAIN_TXS_API },
	gasUsed: { type: 'userMetrics', api: ONCHAIN_GAS_API },

	stablecoins: { type: 'stablecoins' },
	stablecoinInflows: { type: 'stablecoins', dataType: 'inflows' },

	bridgedTvl: { type: 'chainAssets' },

	chainMcap: { type: 'chainToken' },
	chainPrice: { type: 'chainToken' }
}

export default class ChainCharts {
	private static async fetchAndMergeChains(
		chains: string[],
		fetchUrl: (chainName: string) => string,
		extractData: (data: any) => [number, number][]
	): Promise<[number, number][]> {
		if (chains.length === 0) return []

		try {
			const responses = await Promise.all(
				chains.map((chain) => fetch(fetchUrl(chain.includes(' ') ? encodeURIComponent(chain) : chain)))
			)

			const mergedMap = new Map<number, number>()

			for (const response of responses) {
				if (response.ok) {
					const data = await response.json()
					const extracted = extractData(data)
					for (const [timestamp, value] of extracted) {
						mergedMap.set(timestamp, value)
					}
				}
			}

			if (mergedMap.size > 0) {
				return Array.from(mergedMap.entries()).sort((a, b) => a[0] - b[0])
			}
		} catch (error) {
			console.log('Error merging chain data:', error)
		}

		return []
	}

	private static getChainNames(chain: string): string[] {
		const displayName = toDisplayName(chain)
		if (displayName !== chain) {
			return [chain, displayName]
		}
		return [chain]
	}

	private static async dimensionsData(chain: string, endpoint: string, dataType?: string): Promise<[number, number][]> {
		if (!chain) return []
		const apiChain = toDisplayName(chain)
		const encodedChain = apiChain.includes(' ') ? encodeURIComponent(apiChain) : apiChain
		const url = dataType
			? `${DIMENSIONS_OVERVIEW_API}/${endpoint}/${encodedChain}?dataType=${dataType}`
			: `${DIMENSIONS_OVERVIEW_API}/${endpoint}/${encodedChain}`
		const response = await fetch(url)
		const data = await response.json()
		return convertToNumberFormat(data.totalDataChart ?? [])
	}

	private static async userMetrics(chain: string, api: string): Promise<[number, number][]> {
		if (!chain) return []
		const apiChain = toDisplayName(chain)
		const encodedChain = apiChain.includes(' ') ? encodeURIComponent(apiChain) : apiChain
		const response = await fetch(`${api}/chain$${encodedChain}`)
		const data = await response.json()
		return convertToNumberFormat(data ?? [])
	}

	private static async tvlData(chain: string): Promise<[number, number][]> {
		if (!chain) return []

		const chainNames = this.getChainNames(chain)

		if (chainNames.length === 1) {
			const response = await fetch(`${CHART_API}/${chain}`)
			const data = await response.json()
			const adjustedTvl = processAdjustedTvl(data)
			return convertToNumberFormat(adjustedTvl)
		}

		return this.fetchAndMergeChains(
			chainNames,
			(chainName) => `${CHART_API}/${chainName}`,
			(data) => {
				const adjustedTvl = processAdjustedTvl(data)
				return convertToNumberFormat(adjustedTvl)
			}
		)
	}

	private static async stablecoinsData(chain: string, dataType?: string): Promise<[number, number][]> {
		if (!chain) return []
		const apiChain = toDisplayName(chain)
		const encodedChain = apiChain.includes(' ') ? encodeURIComponent(apiChain) : apiChain
		const data = await fetchStablecoinChartApi(encodedChain)

		if (!data.aggregated || !Array.isArray(data.aggregated)) return []

		if (dataType === 'inflows') {
			return this.calculateInflows(data.aggregated)
		}

		const formattedData: [number, number][] = data.aggregated.map((item: any) => [
			parseInt(item.date, 10),
			item.totalCirculatingUSD?.peggedUSD || 0
		])

		return formattedData
	}

	private static async protocolData(chain: string, endpoint: string, dataType?: string): Promise<[number, number][]> {
		if (!chain) return []
		const apiChain = toDisplayName(chain)
		const encodedChain = apiChain.includes(' ') ? encodeURIComponent(apiChain) : apiChain
		const url = dataType
			? `${DIMENSIONS_SUMMARY_API}/${endpoint}/${encodedChain}?dataType=${dataType}`
			: `${DIMENSIONS_SUMMARY_API}/${endpoint}/${encodedChain}`
		const response = await fetch(url)
		const data = await response.json()
		return convertToNumberFormat(data.totalDataChart ?? [])
	}

	private static calculateInflows(aggregatedData: any[]): [number, number][] {
		if (aggregatedData.length < 2) return []

		const inflowsData: [number, number][] = []

		for (let i = 1; i < aggregatedData.length; i++) {
			const currentDay = aggregatedData[i]
			const prevDay = aggregatedData[i - 1]

			const currentMcap = currentDay.totalCirculatingUSD?.peggedUSD || 0
			const prevMcap = prevDay.totalCirculatingUSD?.peggedUSD || 0
			const inflow = currentMcap - prevMcap

			inflowsData.push([parseInt(currentDay.date, 10), inflow])
		}
		return inflowsData
	}

	private static async chainAssetsData(chain: string): Promise<[number, number][]> {
		if (!chain) return []

		const chainNames = this.getChainNames(chain)

		if (chainNames.length === 1) {
			const data = await fetchChainAssetsChart(chain).catch(() => null)
			if (!Array.isArray(data)) return []
			return data.map((item) => [Number(item.timestamp), Number(item.data?.total) || 0])
		}

		try {
			const responses = await Promise.all(
				chainNames.map((chainName) => fetchChainAssetsChart(chainName).catch(() => null))
			)
			const mergedMap = new Map<number, number>()
			for (const data of responses) {
				if (!Array.isArray(data)) continue
				for (const item of data) {
					const timestamp = Number(item.timestamp)
					const value = Number(item.data?.total) || 0
					mergedMap.set(timestamp, value)
				}
			}
			return Array.from(mergedMap.entries()).sort((a, b) => a[0] - b[0])
		} catch (error) {
			console.log('Error merging chain assets data:', error)
			return []
		}
	}

	private static async getTokenData(geckoId: string) {
		if (!geckoId) return null
		const url = `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`
		const response = await fetch(url)
		const { data } = await response.json()
		return data
	}

	private static async chainMcapData(_chain: string, geckoId?: string): Promise<[number, number][]> {
		if (!geckoId) return []
		const data = await this.getTokenData(geckoId)
		if (!data) return []
		const converted = convertToNumberFormat(data.mcaps ?? [], true)
		return normalizeHourlyToDaily(converted, 'last')
	}

	private static async chainPriceData(_chain: string, geckoId?: string): Promise<[number, number][]> {
		if (!geckoId) return []
		const data = await this.getTokenData(geckoId)
		if (!data) return []
		const converted = convertToNumberFormat(data.prices ?? [], true)
		return normalizeHourlyToDaily(converted, 'last')
	}

	static async getData(chartType: string, chain: string, geckoId?: string): Promise<[number, number][]> {
		const metadata = CHART_METADATA[chartType]

		if (!metadata) {
			console.log(`Unknown chart type: ${chartType}`)
			return []
		}

		switch (metadata.type) {
			case 'tvl':
				return this.tvlData(chain)
			case 'dimensions':
				return this.dimensionsData(chain, metadata.endpoint, metadata.dataType)
			case 'protocol':
				return this.protocolData(chain, metadata.endpoint, metadata.dataType)
			case 'userMetrics':
				return this.userMetrics(chain, metadata.api)
			case 'stablecoins':
				return this.stablecoinsData(chain, metadata.dataType)
			case 'chainAssets':
				return this.chainAssetsData(chain)
			case 'chainToken':
				if (chartType === 'chainMcap') {
					return this.chainMcapData(chain, geckoId)
				} else if (chartType === 'chainPrice') {
					return this.chainPriceData(chain, geckoId)
				}
				return []
			default:
				console.log(`Unknown metadata type: ${metadata.type}`)
				return []
		}
	}

	// Legacy method wrappers for backward compatibility
	static async tvl(chain: string): Promise<[number, number][]> {
		return this.getData('tvl', chain)
	}
	static async volume(chain: string): Promise<[number, number][]> {
		return this.getData('volume', chain)
	}
	static async fees(chain: string): Promise<[number, number][]> {
		return this.getData('fees', chain)
	}
	static async revenue(chain: string): Promise<[number, number][]> {
		return this.getData('revenue', chain)
	}
	static async bribes(chain: string): Promise<[number, number][]> {
		return this.getData('bribes', chain)
	}
	static async tokenTax(chain: string): Promise<[number, number][]> {
		return this.getData('tokenTax', chain)
	}
	static async aggregators(chain: string): Promise<[number, number][]> {
		return this.getData('aggregators', chain)
	}
	static async perps(chain: string): Promise<[number, number][]> {
		return this.getData('perps', chain)
	}
	static async bridgeAggregators(chain: string): Promise<[number, number][]> {
		return this.getData('bridgeAggregators', chain)
	}
	static async perpsAggregators(chain: string): Promise<[number, number][]> {
		return this.getData('perpsAggregators', chain)
	}
	static async options(chain: string): Promise<[number, number][]> {
		return this.getData('options', chain)
	}
	static async users(chain: string): Promise<[number, number][]> {
		return this.getData('users', chain)
	}
	static async activeUsers(chain: string): Promise<[number, number][]> {
		return this.getData('activeUsers', chain)
	}
	static async newUsers(chain: string): Promise<[number, number][]> {
		return this.getData('newUsers', chain)
	}
	static async txs(chain: string): Promise<[number, number][]> {
		return this.getData('txs', chain)
	}
	static async gasUsed(chain: string): Promise<[number, number][]> {
		return this.getData('gasUsed', chain)
	}
	static async stablecoins(chain: string): Promise<[number, number][]> {
		return this.getData('stablecoins', chain)
	}
	static async stablecoinInflows(chain: string): Promise<[number, number][]> {
		return this.getData('stablecoinInflows', chain)
	}
	static async chainFees(chain: string): Promise<[number, number][]> {
		return this.getData('chainFees', chain)
	}
	static async chainRevenue(chain: string): Promise<[number, number][]> {
		return this.getData('chainRevenue', chain)
	}
	static async bridgedTvl(chain: string): Promise<[number, number][]> {
		return this.getData('bridgedTvl', chain)
	}
	static async chainMcap(chain: string, geckoId?: string): Promise<[number, number][]> {
		return this.getData('chainMcap', chain, geckoId)
	}
	static async chainPrice(chain: string, geckoId?: string): Promise<[number, number][]> {
		return this.getData('chainPrice', chain, geckoId)
	}
}
