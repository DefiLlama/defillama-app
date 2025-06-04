import {
	CHART_API,
	DIMENISIONS_OVERVIEW_API,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_GAS_USED_API
} from '~/constants'

export default class ChainCharts {
	private static convertToNumberFormat(data: [string, number][]): [number, number][] {
		return data.map(([date, value]) => [typeof date === 'string' ? parseInt(date, 10) : date, value])
	}

	static async dimensionsData(chain: string, type: string, dataType?: string): Promise<[number, number][]> {
		if (!chain) return []
		const url = dataType
			? `${DIMENISIONS_OVERVIEW_API}/${type}/${chain}?dataType=${dataType}`
			: `${DIMENISIONS_OVERVIEW_API}/${type}/${chain}`
		const response = await fetch(url)
		const data = await response.json()
		return this.convertToNumberFormat(data.totalDataChart ?? [])
	}

	static async userMetrics(chain: string, api: string): Promise<[number, number][]> {
		if (!chain) return []
		const response = await fetch(`${api}/chain$${chain}`)
		const data = await response.json()
		return this.convertToNumberFormat(data ?? [])
	}

	static async tvl(chain: string): Promise<[number, number][]> {
		if (!chain) return []
		const response = await fetch(`${CHART_API}/${chain}`)
		const data = await response.json()
		return this.convertToNumberFormat(data.tvl ?? [])
	}

	static async volume(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'dexs')
	}

	static async fees(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'fees')
	}

	static async revenue(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'fees', 'dailyRevenue')
	}

	static async bribes(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'fees', 'dailyBribesRevenue')
	}

	static async tokenTax(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'fees', 'dailyTokenTaxes')
	}

	static async aggregators(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'aggregators')
	}

	static async perps(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'derivatives')
	}

	static async bridgeAggregators(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'bridge-aggregators')
	}

	static async perpsAggregators(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'aggregator-derivatives')
	}

	static async options(chain: string): Promise<[number, number][]> {
		return this.dimensionsData(chain, 'options')
	}

	static async users(chain: string): Promise<[number, number][]> {
		return this.userMetrics(chain, PROTOCOL_ACTIVE_USERS_API)
	}

	static async activeUsers(chain: string): Promise<[number, number][]> {
		return this.userMetrics(chain, PROTOCOL_ACTIVE_USERS_API)
	}

	static async newUsers(chain: string): Promise<[number, number][]> {
		return this.userMetrics(chain, PROTOCOL_NEW_USERS_API)
	}

	static async txs(chain: string): Promise<[number, number][]> {
		return this.userMetrics(chain, PROTOCOL_TRANSACTIONS_API)
	}

	static async gasUsed(chain: string): Promise<[number, number][]> {
		return this.userMetrics(chain, PROTOCOL_GAS_USED_API)
	}
}
