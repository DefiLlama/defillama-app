import dayjs from 'dayjs'
import { getAPIUrlSummary } from '~/api/categories/adaptors/client'
import { CACHE_SERVER, PROTOCOL_API, YIELD_PROJECT_MEDIAN_API } from '~/constants'
import { convertToNumberFormat } from '../utils'

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
	static async summary(protocol: string, type: string, dataType?: string): Promise<[number, number][]> {
		if (!protocol) return []
		const url = getAPIUrlSummary(type, protocol, dataType)
		const response = await fetch(url)
		let data
		try {
			data = await response.json()
		} catch (e) {
			return []
		}
		console.log(data)
		return convertToNumberFormat(data.totalDataChart ?? [])
	}

	static async volume(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'dexs')
	}

	static async fees(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees')
	}

	static async revenue(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyRevenue')
	}

	static async getTokenData(geckoId: string) {
		let url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
		const response = await fetch(url)
		const { data } = await response.json()
		return data
	}

	static async tokenMcap(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		return convertToNumberFormat(data.mcaps ?? [], true)
	}

	static async tokenPrice(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		return convertToNumberFormat(data.prices ?? [], true)
	}

	static async tokenVolume(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		return convertToNumberFormat(data.volumes ?? [], true)
	}

	static async medianApy(protocol: string): Promise<[number, number][]> {
		const response = await fetch(`${YIELD_PROJECT_MEDIAN_API}/${protocol}`)
		const { data } = await response.json()
		const res = data.map((item) => [dayjs(item.timestamp).unix(), item.medianApy])
		return res
	}
}
