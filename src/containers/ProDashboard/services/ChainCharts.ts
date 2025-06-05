import {
	CHART_API,
	DIMENISIONS_OVERVIEW_API,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_GAS_USED_API
} from '~/constants'
import { convertToNumberFormat } from '../utils'

const CHART_METADATA = {
	tvl: { type: 'tvl' },

	volume: { type: 'dimensions', endpoint: 'dexs' },
	fees: { type: 'dimensions', endpoint: 'fees' },
	revenue: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyRevenue' },
	bribes: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyBribesRevenue' },
	tokenTax: { type: 'dimensions', endpoint: 'fees', dataType: 'dailyTokenTaxes' },
	aggregators: { type: 'dimensions', endpoint: 'aggregators' },
	perps: { type: 'dimensions', endpoint: 'derivatives' },
	bridgeAggregators: { type: 'dimensions', endpoint: 'bridge-aggregators' },
	perpsAggregators: { type: 'dimensions', endpoint: 'aggregator-derivatives' },
	options: { type: 'dimensions', endpoint: 'options' },

	users: { type: 'userMetrics', api: PROTOCOL_ACTIVE_USERS_API },
	activeUsers: { type: 'userMetrics', api: PROTOCOL_ACTIVE_USERS_API },
	newUsers: { type: 'userMetrics', api: PROTOCOL_NEW_USERS_API },
	txs: { type: 'userMetrics', api: PROTOCOL_TRANSACTIONS_API },
	gasUsed: { type: 'userMetrics', api: PROTOCOL_GAS_USED_API }
}

export default class ChainCharts {
	private static async dimensionsData(chain: string, endpoint: string, dataType?: string): Promise<[number, number][]> {
		if (!chain) return []
		const url = dataType
			? `${DIMENISIONS_OVERVIEW_API}/${endpoint}/${chain}?dataType=${dataType}`
			: `${DIMENISIONS_OVERVIEW_API}/${endpoint}/${chain}`
		const response = await fetch(url)
		const data = await response.json()
		console.log(data)
		return convertToNumberFormat(data.totalDataChart ?? [])
	}

	private static async userMetrics(chain: string, api: string): Promise<[number, number][]> {
		if (!chain) return []
		const response = await fetch(`${api}/chain$${chain}`)
		const data = await response.json()
		return convertToNumberFormat(data ?? [])
	}

	private static async tvlData(chain: string): Promise<[number, number][]> {
		if (!chain) return []
		const response = await fetch(`${CHART_API}/${chain}`)
		const data = await response.json()
		const res = convertToNumberFormat(data.tvl ?? [])
		console.log(res)
		return res
	}

	static async getData(chartType: string, chain: string): Promise<[number, number][]> {
		const metadata = CHART_METADATA[chartType]

		if (!metadata) {
			console.error(`Unknown chart type: ${chartType}`)
			return []
		}

		switch (metadata.type) {
			case 'tvl':
				return this.tvlData(chain)
			case 'dimensions':
				return this.dimensionsData(chain, metadata.endpoint, metadata.dataType)
			case 'userMetrics':
				return this.userMetrics(chain, metadata.api)
			default:
				console.error(`Unknown metadata type: ${metadata.type}`)
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
}
