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
		categories: string[]
	): string {
		return `${metric}-${chains.join(',')}-${limit}-${categories.join(',') || 'all'}`
	}

	private static async fetchSplitData(
		metric: string,
		chains: string[],
		limit: number,
		categories: string[]
	): Promise<ProtocolSplitData> {
		const params = new URLSearchParams()

		if (chains.length > 0) {
			params.append('chains', chains.join(','))
		}
		
		params.append('limit', limit.toString())
		
		if (categories.length > 0) {
			params.append('categories', categories.join(','))
		}

		const response = await fetch(`/api/protocols/split/${metric}?${params.toString()}`)
		
		if (!response.ok) {
			throw new Error(`Failed to fetch ${metric} split data: ${response.statusText}`)
		}

		return response.json()
	}

	static async getProtocolSplitData(
		metric: 'fees' | 'revenue' | 'volume' | 'perps' | 'options-notional' | 'options-premium' | 
			'bridge-aggregators' | 'dex-aggregators' | 'perps-aggregators' | 'earnings' | 
			'user-fees' | 'holders-revenue' | 'protocol-revenue' | 'supply-side-revenue',
		chains: string[],
		limit: number = 10,
		categories: string[] = []
	): Promise<ProtocolSplitData> {
		const cacheKey = this.getCacheKey(metric, chains, limit, categories)
		const cached = this.cache.get(cacheKey)

		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.data
		}

		try {
			const data = await this.fetchSplitData(metric, chains, limit, categories)
			
			this.cache.set(cacheKey, {
				data,
				timestamp: Date.now()
			})

			this.cleanCache()

			return data
		} catch (error) {
			console.error(`Error fetching ${metric} split data:`, error)
			
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

	static async getFeesSplit(chains: string[], limit?: number, categories: string[] = []) {
		return this.getProtocolSplitData('fees', chains, limit, categories)
	}

	static async getRevenueSplit(chains: string[], limit?: number, categories: string[] = []) {
		return this.getProtocolSplitData('revenue', chains, limit, categories)
	}

	static async getVolumeSplit(chains: string[], limit?: number, categories: string[] = []) {
		return this.getProtocolSplitData('volume', chains, limit, categories)
	}
}