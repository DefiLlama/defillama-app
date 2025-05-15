import { getAPIUrlSummary } from '~/api/categories/adaptors/client'
import { PROTOCOL_API } from '~/constants'

interface DateTvl {
	date: number
	totalLiquidityUSD: number
}

interface ChainTvlData {
	tvl: DateTvl[]
}

interface ProtocolApiResponse {
	chainTvls: Record<string, ChainTvlData>
}

export default class ProtocolCharts {
	static async tvl(protocolId: string): Promise<[number, number][]> {
		if (!protocolId) {
			return []
		}
		try {
			const response = await fetch(`${PROTOCOL_API}/${protocolId}`)
			if (!response.ok) {
				console.error(`Failed to fetch protocol TVL for ${protocolId}: ${response.status}`)
				return []
			}
			const data: ProtocolApiResponse = await response.json()

			const dailyAggregatedTvl: Record<number, number> = {}

			Object.values(data.chainTvls).forEach((chainTvlData) => {
				chainTvlData.tvl.forEach((item) => {
					dailyAggregatedTvl[item.date] = (dailyAggregatedTvl[item.date] || 0) + item.totalLiquidityUSD
				})
			})

			const sortedData = Object.entries(dailyAggregatedTvl)
				.map(([date, tvl]) => [parseInt(date, 10), tvl] as [number, number])
				.sort((a, b) => a[0] - b[0])

			return sortedData
		} catch (error) {
			console.error(`Error fetching or processing protocol TVL for ${protocolId}:`, error)
			return []
		}
	}
	static async summary(protocol: string, type: string, dataType?: string): Promise<any> {
		if (!protocol) return []
		const url = getAPIUrlSummary(type, protocol, dataType)
		const response = await fetch(url)
		const data = await response.json()
		console.log(data)
		return data.totalDataChart ?? []
	}

	static async volume(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'dexs')
	}

	static async fees(protocol: string): Promise<any> {
		return this.summary(protocol, 'fees')
	}

	static async revenue(protocol: string): Promise<any> {
		return this.summary(protocol, 'fees', 'dailyRevenue')
	}
}
