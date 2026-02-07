import { CACHE_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'

export type TokenMarketData = {
	price: number | null
	prevPrice: number | null
	priceChangePercent: number | null
	mcap: number | null
	volume24h: number | null
	circSupply: number | null
	maxSupply: number | null
	maxSupplyInfinite: boolean | null
}

export async function getTokenMarketDataFromCgChart(geckoId: string): Promise<TokenMarketData | null> {
	if (!geckoId) return null

	const res = await fetchJson(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).catch(() => null as any)
	const data = res?.data
	if (!data) return null

	const marketData = data?.coinData?.market_data
	const prices = Array.isArray(data?.prices) ? (data.prices as Array<[number, number]>) : null
	const mcaps = Array.isArray(data?.mcaps) ? (data.mcaps as Array<[number, number]>) : null
	const volumes = Array.isArray(data?.volumes) ? (data.volumes as Array<[number, number]>) : null

	const lastPrice = prices?.[prices.length - 1]?.[1]
	const prevPrice = prices?.[prices.length - 2]?.[1]
	const lastMcap = mcaps?.[mcaps.length - 1]?.[1]
	const lastVolume = volumes?.[volumes.length - 1]?.[1]

	const priceChangePercent =
		typeof lastPrice === 'number' && typeof prevPrice === 'number' && prevPrice !== 0
			? +(((lastPrice - prevPrice) / prevPrice) * 100).toFixed(2)
			: null

	return {
		price: typeof lastPrice === 'number' ? lastPrice : null,
		prevPrice: typeof prevPrice === 'number' ? prevPrice : null,
		priceChangePercent,
		mcap: typeof lastMcap === 'number' ? lastMcap : null,
		volume24h: typeof lastVolume === 'number' ? lastVolume : null,
		circSupply: typeof marketData?.circulating_supply === 'number' ? marketData.circulating_supply : null,
		maxSupply: typeof marketData?.max_supply === 'number' ? marketData.max_supply : null,
		maxSupplyInfinite: typeof marketData?.max_supply_infinite === 'boolean' ? marketData.max_supply_infinite : null
	}
}
