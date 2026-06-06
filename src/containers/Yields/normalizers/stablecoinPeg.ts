import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import type { StablecoinInfoBySymbol, YieldPageProps } from '../types'

export async function enrichStablecoinPegData(data: YieldPageProps): Promise<YieldPageProps> {
	try {
		const stablecoins = await fetchStablecoinAssetsApi({ includePrices: true })
		const peggedAssets = stablecoins?.peggedAssets || []
		const usdPeggedSymbolsSet = new Set<string>()
		const stablecoinInfoBySymbol: StablecoinInfoBySymbol = {}
		const seenStablecoinInfo = new Set<string>()
		for (const asset of peggedAssets) {
			if (asset?.pegType !== 'peggedUSD' || typeof asset.symbol !== 'string' || !asset.symbol) continue
			const symbol = asset.symbol.toLowerCase()
			if (asset.symbol.length >= 2) {
				usdPeggedSymbolsSet.add(symbol)
			}

			if (seenStablecoinInfo.has(symbol)) continue
			seenStablecoinInfo.add(symbol)

			const price =
				typeof asset.price === 'number' ? asset.price : typeof asset.price === 'string' ? parseFloat(asset.price) : null
			const pegDeviation =
				asset.yieldBearing || price == null || !Number.isFinite(price) ? null : ((price - 1) / 1) * 100
			stablecoinInfoBySymbol[symbol] = { price, pegDeviation }
		}

		const usdPeggedSymbols = Array.from(usdPeggedSymbolsSet)
		data.usdPeggedSymbols = usdPeggedSymbols
		data.stablecoinInfoBySymbol = stablecoinInfoBySymbol
	} catch {
		data.usdPeggedSymbols = []
		data.stablecoinInfoBySymbol = {}
	}

	return data
}
