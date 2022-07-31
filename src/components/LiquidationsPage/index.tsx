/* eslint-disable no-unused-vars*/
import BigNumber from 'bignumber.js'
import liqs from '../../components/LiquidationsPage/sampleLiqs.json'

export interface Liq {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: string
}
const _liqs = liqs as Liq[]
export { _liqs as liqs }

export interface Position {
	liqPrice: number
	collateralValue: number
	chain: string
	protocol: string
}

export type Price = {
	decimals: number
	currentPrice: number
	symbol: string
	timestamp: number
}

/**
 * Transform adapter data of one collateral type to flattened data to be used in chart
 *
 * @param liqs - raw liq data pulled from adapter for a protocol
 * @param collaterals - the same asset on diff chains in format of "ethereum:0x1234..."
 * @param decimals - decimals of the asset
 * @param protocol - protocol adapter id, like "aave-v2", "liquity"...
 * @returns flattened liquidable positions with chain + protocol id
 */
export function flattenPositions(liqs: Liq[], collaterals: string[], decimals: number, protocol: string): Position[] {
	return liqs
		.filter((liq) => collaterals.includes(liq.collateral))
		.map((liq) => {
			const collateralValue = new BigNumber(liq.collateralAmount)
				.times(new BigNumber(liq.liqPrice)) // we calculate the value at the price of liquidation
				.div(10 ** decimals)
				.toNumber()
			const chain = liq.collateral.split(':')[0]
			return {
				liqPrice: liq.liqPrice,
				collateralValue,
				chain,
				protocol
			}
		})
}

export type MultiTokenAssetSet = Set<Price>

/**
 * Transform the output of multiple adapters to a single data structure aggregated by assets
 *
 */
export async function aggregateAdapterDataByAsset(adapterOutput: { [protocol: string]: Liq[] }) {
	const protocols = Object.keys(adapterOutput)
	// an asset has unique info "symbol" and that's it - we're assuming no duplicate symbols cuz all are bluechips
	// would be better to use coingeckoId but didn't find a lookup api for that
	// might add an option to return coingeckoId to https://coins.llama.fi/prices later
	const knownAssets = new Map<string, MultiTokenAssetSet>() // symbol -> ['ethereum:0x1234...']
	const knownTokens = new Set<string>()
	// gonna go thru all entries first to find all Collaterals
	for (const protocol of protocols) {
		adapterOutput[protocol].forEach((liq) => knownTokens.add(liq.collateral))
	}
	const prices = await getPrices(Array.from(knownTokens))
	for (const address in prices) {
		const price = prices[address]
		let collateralSet: MultiTokenAssetSet = knownAssets.get(price.symbol)
		if (!collateralSet) {
			collateralSet = new Set<Price>()
			collateralSet.add(price)
			knownAssets.set(price.symbol, collateralSet)
		} else {
			collateralSet.add(price)
		}
	}
	// now we have all assets and metadata we can start aggregating into flattenPositions
	const aggregatedData = new Map<string, { currentPrice: number; positions: Position[] }>() // symbol -> [{liqPrice, collateralValue, chain, protocol}]
	for (const protocol of protocols) {
		const liqs = adapterOutput[protocol]
		liqs.forEach(({ liqPrice, collateral, collateralAmount }) => {
			const chain = collateral.split(':')[0]
			const { symbol, decimals, currentPrice } = prices[collateral]
			const position: Position = {
				liqPrice,
				collateralValue: new BigNumber(collateralAmount)
					.div(10 ** decimals)
					.times(liqPrice)
					.toNumber(),
				chain,
				protocol
			}
			let _positions = aggregatedData.get(symbol)
			if (!_positions) {
				_positions = { currentPrice, positions: [position] }
				aggregatedData.set(symbol, _positions)
			} else {
				_positions.positions.push(position)
			}
		})
	}
	return aggregatedData
}

export async function getPrices(collaterals: string[]) {
	const res = await fetch('https://coins.llama.fi/prices', {
		method: 'POST',
		body: JSON.stringify({
			coins: collaterals
		})
	})
	const data = await res.json()
	const prices = data.coins as {
		[address: string]: Price
	}
	return prices
}

export async function getLendingDominance(symbol: string) {
	// TODO: implement on backend
	return 0.69
}
export async function getHistoricalChange(symbol: string, hours: number) {
	// TODO: implement on backend
	return -0.42
}
export async function getTotalLiquidable(symbol: string) {
	// TODO: implement on backend
	return 69_000_000_000
}

export type ChartData = {
	symbol: string // could change to coingeckoId in the future
	currentPrice: number
	lendingDominance: number // in ratio of total collateral amount tracked
	historicalChange: {
		[hours: number]: number // 1h, 6h, 12h, 1d, 7d, 30d etc in ratio
	}
	totalLiquidable: number
	positions: Position[]
}

export interface ChartDataBins {
	bins: {
		[bin: number]: number
	}
	binSize: number
	price: number
}

export function getChartDataBins(
	positions: Position[],
	currentPrice: number,
	totalBins: number,
	aggregateBy: 'protocol' | 'chain'
): Map<string, ChartDataBins> {
	// protocol/chain -> {bins, binSize, price}
	const aggregatedPositions = new Map<string, Position[]>()
	const keySet = new Set<string>()

	// group positions by protocol or chain
	for (const position of positions) {
		keySet.add(position[aggregateBy])
		let positionsGroup: Position[] = aggregatedPositions.get(position[aggregateBy])
		if (!positionsGroup) {
			positionsGroup = [position]
			aggregatedPositions.set(position[aggregateBy], positionsGroup)
		} else {
			positionsGroup.push(position)
		}
	}

	const bins = new Map<string, ChartDataBins>()
	// init bins
	for (const key of keySet) {
		bins.set(key, {
			bins: {},
			binSize: currentPrice / totalBins,
			price: currentPrice
		})
	}
	// fill bins
	for (const [key, positionsGroup] of aggregatedPositions) {
		const binSize = bins.get(key)!.binSize
		const binsGroup = bins.get(key)!.bins
		for (const position of positionsGroup) {
			const bin = Math.floor(position.collateralValue / binSize)
			if (!binsGroup[bin]) {
				binsGroup[bin] = position.collateralValue
			} else {
				binsGroup[bin] += position.collateralValue
			}
		}
	}

	return bins
}

// usage:
