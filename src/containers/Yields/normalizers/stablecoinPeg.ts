import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import type { StablecoinInfoBySymbol, YieldPageProps } from '../types'

export async function enrichStablecoinPegData(data: YieldPageProps): Promise<YieldPageProps> {
	try {
		const stablecoins = await fetchStablecoinAssetsApi({ includePrices: true })
		const peggedAssets = stablecoins?.peggedAssets || []
		const usdPeggedSymbols = Array.from(
			new Set(
				peggedAssets
					.filter(
						(asset) => asset?.pegType === 'peggedUSD' && typeof asset?.symbol === 'string' && asset.symbol.length >= 2
					)
					.map((asset) => asset.symbol.toLowerCase())
			)
		)
		data.usdPeggedSymbols = usdPeggedSymbols

		const stablecoinInfoBySymbol = new Map<string, { price: number | null; pegDeviation: number | null }>()
		for (const asset of peggedAssets) {
			if (!asset?.symbol || asset.pegType !== 'peggedUSD') continue
			const symbol = asset.symbol.toLowerCase()
			const price =
				typeof asset.price === 'number' ? asset.price : typeof asset.price === 'string' ? parseFloat(asset.price) : null
			const targetPrice = asset.pegType === 'peggedUSD' ? 1 : null
			const pegDeviation =
				asset.yieldBearing || price == null || targetPrice == null || !Number.isFinite(price)
					? null
					: ((price - targetPrice) / targetPrice) * 100
			if (!stablecoinInfoBySymbol.has(symbol)) {
				stablecoinInfoBySymbol.set(symbol, { price, pegDeviation })
			}
		}
		data.stablecoinInfoBySymbol = Object.fromEntries(stablecoinInfoBySymbol) as StablecoinInfoBySymbol
	} catch {
		data.usdPeggedSymbols = []
		data.stablecoinInfoBySymbol = {}
	}

	return data
}
