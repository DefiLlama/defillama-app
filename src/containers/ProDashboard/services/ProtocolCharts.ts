import dayjs from 'dayjs'
import { getAPIUrlSummary } from '~/api/categories/adaptors/client'
import {
	CACHE_SERVER,
	PROTOCOL_API,
	PROTOCOL_API_MINI,
	PROTOCOL_EMISSION_API,
	PROTOCOL_TREASURY_API,
	TOKEN_LIQUIDITY_API,
	YIELD_PROJECT_MEDIAN_API
} from '~/constants'
import { processAdjustedProtocolTvl, ProtocolChainTvls } from '~/utils/tvl'
import { convertToNumberFormat, normalizeHourlyToDaily } from '../utils'

interface DateTvl {
	date: number
	totalLiquidityUSD: number
}

interface ChainTvlData {
	tvl: DateTvl[] | [number, number][]
}

interface ProtocolApiResponse {
	chainTvls: Record<string, ChainTvlData>
}

interface ProtocolApiMiniResponse {
	chainTvls: Record<string, { tvl: [number, number][] }>
	tvl: [number, number][]
}

export default class ProtocolCharts {
	static async tvl(protocolId: string): Promise<[number, number][]> {
		if (!protocolId) {
			return []
		}
		try {
			const response = await fetch(`${PROTOCOL_API_MINI}/${protocolId}`)
			if (!response.ok) {
				console.log(`Failed to fetch protocol TVL for ${protocolId}: ${response.status}`)
				return []
			}
			const data: ProtocolApiMiniResponse = await response.json()

			if (Array.isArray(data?.tvl) && data.tvl.length > 0 && Array.isArray(data.tvl[0])) {
				return data.tvl as [number, number][]
			}

			const adjusted = processAdjustedProtocolTvl(data?.chainTvls as unknown as ProtocolChainTvls)
			return adjusted
		} catch (error) {
			console.log(`Error fetching or processing protocol TVL for ${protocolId}:`, error)
			return []
		}
	}
	static async summary(protocol: string, type: string, dataType?: string): Promise<[number, number][]> {
		if (!protocol) return []
		const url = getAPIUrlSummary(type, protocol, dataType)
		const response = await fetch(url)
		const data = await response.json()
		return convertToNumberFormat(data.totalDataChart ?? [])
	}

	static async volume(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'dexs')
	}

	static async incentives(protocol: string): Promise<[number, number][]> {
		if (!protocol) return []
		try {
			const res = await fetch(`${PROTOCOL_EMISSION_API}/${protocol}`)
			if (!res.ok) return []
			const json = await res.json()
			const body = typeof json?.body === 'string' ? JSON.parse(json.body) : json?.body
			const chart: any[] = body?.unlockUsdChart ?? []
			if (!Array.isArray(chart)) return []
			return chart
				.filter((x) => Array.isArray(x) && x.length >= 2)
				.map(([ts, val]) => [Number(ts), Number(val)] as [number, number])
				.sort((a, b) => a[0] - b[0])
		} catch (e) {
			console.log('Error fetching protocol incentives', e)
			return []
		}
	}

	static async fees(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyFees')
	}

	static async revenue(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyRevenue')
	}

	static async holdersRevenue(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyHoldersRevenue')
	}

	static async bribes(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyBribesRevenue')
	}

	static async tokenTax(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'fees', 'dailyTokenTaxes')
	}

	static async perps(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'derivatives')
	}

	static async openInterest(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'open-interest', 'openInterestAtEnd')
	}

	static async aggregators(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'aggregators')
	}

	static async perpsAggregators(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'aggregator-derivatives')
	}

	static async bridgeAggregators(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'bridge-aggregators')
	}

	static async optionsPremium(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'options', 'dailyPremiumVolume')
	}

	static async optionsNotional(protocol: string): Promise<[number, number][]> {
		return this.summary(protocol, 'options', 'dailyNotionalVolume')
	}

	static async getTokenData(geckoId: string) {
		let url = geckoId ? `${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true` : null
		const response = await fetch(url)
		const { data } = await response.json()
		return data
	}

	static async tokenMcap(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		const converted = convertToNumberFormat(data.mcaps ?? [], true)
		return normalizeHourlyToDaily(converted, 'last')
	}

	static async tokenPrice(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		const converted = convertToNumberFormat(data.prices ?? [], true)
		return normalizeHourlyToDaily(converted, 'last')
	}

	static async tokenVolume(_: string, geckoId: string): Promise<[number, number][]> {
		const data = await this.getTokenData(geckoId)
		const converted = convertToNumberFormat(data.volumes ?? [], true)
		return normalizeHourlyToDaily(converted, 'sum')
	}

	static async liquidity(protocol: string): Promise<[number, number][]> {
		if (!protocol) return []
		try {
			const protoRes = await fetch(`${PROTOCOL_API}/${protocol}`)
			if (!protoRes.ok) return []
			const proto = await protoRes.json()
			const symbol: string | undefined = proto?.symbol
			if (!symbol) return []

			const listRes = await fetch(`https://defillama-datasets.llama.fi/liquidity.json`)
			if (!listRes.ok) return []
			const tokens = await listRes.json()
			const entry = Array.isArray(tokens)
				? tokens.find((t: any) => String(t?.symbol).toUpperCase() === String(symbol).toUpperCase())
				: null
			const tokenId = entry?.id
			if (!tokenId) return []

			const histRes = await fetch(`${TOKEN_LIQUIDITY_API}/${encodeURIComponent(tokenId)}`)
			if (!histRes.ok) return []
			const hist = await histRes.json()
			if (!Array.isArray(hist)) return []
			return hist
				.filter((x) => Array.isArray(x) && x.length >= 2)
				.map(([ts, val]) => [Number(ts), Number(val)] as [number, number])
				.sort((a, b) => a[0] - b[0])
		} catch (e) {
			console.log('Error fetching token liquidity', e)
			return []
		}
	}

	static async treasury(protocol: string): Promise<[number, number][]> {
		if (!protocol) return []
		try {
			const res = await fetch(`${PROTOCOL_TREASURY_API}/${protocol}`)
			if (!res.ok) return []
			const data = await res.json()
			const chainTvls = data?.chainTvls || {}
			const store: Record<number, number> = {}
			for (const key of Object.keys(chainTvls)) {
				const arr = chainTvls[key]?.tvl || []
				for (const item of arr) {
					const d = Number(item?.date)
					const v = Number(item?.totalLiquidityUSD ?? 0)
					if (!Number.isFinite(d) || !Number.isFinite(v)) continue
					store[d] = (store[d] ?? 0) + v
				}
			}
			return Object.entries(store)
				.map(([d, v]) => [Number(d), Number(v)] as [number, number])
				.sort((a, b) => a[0] - b[0])
		} catch (e) {
			console.log('Error fetching protocol treasury', e)
			return []
		}
	}

	static async medianApy(protocol: string): Promise<[number, number][]> {
		const response = await fetch(`${YIELD_PROJECT_MEDIAN_API}/${protocol}`)
		const { data } = await response.json()
		const res = data.map((item) => [dayjs(item.timestamp).unix(), item.medianAPY])
		return res
	}
}
