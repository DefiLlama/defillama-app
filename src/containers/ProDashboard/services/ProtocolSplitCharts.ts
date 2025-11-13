export interface ProtocolSplitData {
	series: {
		name: string
		data: [number, number][]
		color?: string
	}[]
	metadata: {
		chain: string
		chains: string[]
		categories: string[]
		metric: string
		topN: number
		totalProtocols: number
		othersCount: number
		marketSector?: string | null
	}
}

export default class SProtocolSplitCharts {
	private static cache: Map<string, { data: ProtocolSplitData; timestamp: number }> = new Map()
	private static CACHE_DURATION = 60 * 60 * 1000

	private static getCacheKey(
		metric: string,
		chains: string[],
		limit: number,
		categories: string[],
		groupByParent?: boolean,
		filterMode: 'include' | 'exclude' = 'include'
	): string {
		return `${metric}-${chains.join(',')}-${limit}-${categories.join(',') || 'all'}-${groupByParent || false}-${filterMode}`
	}

	private static async fetchSplitData(
		metric: string,
		chains: string[],
		limit: number,
		categories: string[],
		groupByParent?: boolean,
		filterMode: 'include' | 'exclude' = 'include'
	): Promise<ProtocolSplitData> {
		const params = new URLSearchParams()

		if (chains.length > 0) {
			params.append('chains', chains.join(','))
		}

		params.append('limit', limit.toString())

		if (categories.length > 0) {
			params.append('categories', categories.join(','))
		}

		if (groupByParent) {
			params.append('groupByParent', 'true')
		}

		if (filterMode) {
			params.append('filterMode', filterMode)
		}

		const response = await fetch(`/api/protocols/split/${metric}?${params.toString()}`)

		if (!response.ok) {
			throw new Error(`Failed to fetch ${metric} split data: ${response.statusText}`)
		}

		return response.json()
	}

	static async getProtocolSplitData(
		metric:
			| 'tvl'
			| 'fees'
			| 'revenue'
			| 'volume'
			| 'perps'
			| 'options-notional'
			| 'options-premium'
			| 'bridge-aggregators'
			| 'dex-aggregators'
			| 'perps-aggregators'
			| 'earnings'
			| 'user-fees'
			| 'holders-revenue'
			| 'protocol-revenue'
			| 'supply-side-revenue'
			| 'open-interest',
		chains: string[],
		limit: number = 10,
		categories: string[] = [],
		groupByParent?: boolean,
		filterMode: 'include' | 'exclude' = 'include'
	): Promise<ProtocolSplitData> {
		const cacheKey = this.getCacheKey(metric, chains, limit, categories, groupByParent, filterMode)
		const cached = this.cache.get(cacheKey)

		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.data
		}

		try {
			const data = await this.fetchSplitData(metric, chains, limit, categories, groupByParent, filterMode)

			this.cache.set(cacheKey, {
				data,
				timestamp: Date.now()
			})

			this.cleanCache()

			return data
		} catch (error) {
			console.log(`Error fetching ${metric} split data:`, error)

			return {
				series: [],
				metadata: {
					chain: chains.join(','),
					chains: chains,
					categories: categories,
					metric,
					topN: limit,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categories.join(',') || null
				}
			}
		}
	}

	private static cleanCache() {
		const now = Date.now()
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.CACHE_DURATION) {
				this.cache.delete(key)
			}
		}
	}

	static async getFeesSplit(chains: string[], limit?: number, categories: string[] = [], groupByParent?: boolean) {
		return this.getProtocolSplitData('fees', chains, limit, categories, groupByParent)
	}

	static async getRevenueSplit(chains: string[], limit?: number, categories: string[] = [], groupByParent?: boolean) {
		return this.getProtocolSplitData('revenue', chains, limit, categories, groupByParent)
	}

	static async getVolumeSplit(chains: string[], limit?: number, categories: string[] = [], groupByParent?: boolean) {
		return this.getProtocolSplitData('volume', chains, limit, categories, groupByParent)
	}

	static async getTvlSplit(chains: string[], limit?: number, categories: string[] = [], groupByParent?: boolean) {
		return this.getProtocolSplitData('tvl', chains, limit, categories, groupByParent)
	}

	static async getProtocolChainData(
		protocol: string | undefined,
		metric:
			| 'tvl'
			| 'fees'
			| 'revenue'
			| 'volume'
			| 'perps'
			| 'open-interest'
			| 'options-notional'
			| 'options-premium'
			| 'bridge-aggregators'
			| 'dex-aggregators'
			| 'perps-aggregators'
			| 'user-fees'
			| 'holders-revenue'
			| 'protocol-revenue'
			| 'supply-side-revenue'
			| 'stablecoins'
			| 'chain-fees'
			| 'chain-revenue',
		chains?: string[],
		limit: number = 5,
		filterMode: 'include' | 'exclude' = 'include',
		chainCategories?: string[],
		protocolCategories?: string[]
	): Promise<any> {
		const params = new URLSearchParams()
		if (protocol) params.append('protocol', protocol)
		params.append('metric', metric)

		if (chains && chains.length > 0) {
			params.append('chains', chains.join(','))
		}
		if (limit) {
			params.append('limit', String(limit))
		}
		if (filterMode) {
			params.append('filterMode', filterMode)
		}
		if (chainCategories && chainCategories.length > 0) {
			params.append('chainCategories', chainCategories.join(','))
		}
		if (protocolCategories && protocolCategories.length > 0) {
			params.append('protocolCategories', protocolCategories.join(','))
		}

		try {
			const response = await fetch(`/api/protocols/split/protocol-chain?${params.toString()}`)

			if (!response.ok) {
				throw new Error(`Failed to fetch protocol chain data: ${response.statusText}`)
			}

			return response.json()
		} catch (error) {
			console.log(`Error fetching protocol chain data for ${protocol}:`, error)
			return {
				series: [],
				metadata: {
					protocol,
					metric,
					chains: [],
					totalChains: 0
				}
			}
		}
	}
}
