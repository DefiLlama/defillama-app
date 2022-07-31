/* eslint-disable no-unused-vars*/
import BigNumber from 'bignumber.js'
import liquity from './liquity.json'
import euler from './euler.json'
import aave_v2 from './aave-v2.json'
import compound_v2 from './compound-v2.json'

const TOTAL_BINS = 150

interface Liq {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: string
}

interface Position {
	liqPrice: number
	collateralValue: number
	chain: string
	protocol: string // protocol adapter id, like "aave-v2", "liquity"...
}

type Price = {
	decimals: number
	price: number
	symbol: string
	timestamp: number
}

type MultiTokenAssetSet = Set<Price>

/**
 * Transform the output of multiple adapters to a single data structure aggregated by assets
 *
 */
async function aggregateAssetAdapterData(filteredAdapterOutput: { [protocol: string]: Liq[] }) {
	const protocols = Object.keys(filteredAdapterOutput)
	// an asset has unique info "symbol" and that's it - we're assuming no duplicate symbols cuz all are bluechips
	// would be better to use coingeckoId but didn't find a lookup api for that
	// might add an option to return coingeckoId to https://coins.llama.fi/prices later
	const knownAssets = new Map<string, MultiTokenAssetSet>() // symbol -> ['ethereum:0x1234...']
	const knownTokens = new Set<string>()
	// gonna go thru all entries first to find all Collaterals
	for (const protocol of protocols) {
		filteredAdapterOutput[protocol].forEach((liq) => knownTokens.add(liq.collateral))
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
		const liqs = filteredAdapterOutput[protocol]
		liqs.forEach(({ liqPrice, collateral, collateralAmount }) => {
			const chain = collateral.split(':')[0]
			if (!prices[collateral]) {
				// console.error(`Token not supported by price API ${collateral}`)
				return
			}
			const { symbol, decimals, price: currentPrice } = prices[collateral]
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
			if (position.liqPrice > currentPrice) {
				// ignore bad debts or positions being liquidated live
				return
			}
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

async function getPrices(collaterals: string[]) {
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

async function getLendingDominance(symbol: string) {
	// TODO: implement on backend
	return 0.69
}
async function getHistoricalChange(symbol: string, hours: number) {
	// TODO: implement on backend
	return -0.42
}
async function getTotalLiquidable(symbol: string) {
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
	chartDataBins: { [bin: string]: ChartDataBin }
	totalBins: number
	binSize: number
}

export interface ChartDataBin {
	bins: {
		[bin: number]: number
	}
	binSize: number
	price: number
}

function getChartDataBins(
	positions: Position[],
	currentPrice: number,
	totalBins: number,
	aggregateBy: 'protocol' | 'chain'
): { [bin: string]: ChartDataBin } {
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

	const bins = new Map<string, ChartDataBin>()
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
			const bin = Math.floor(position.liqPrice / binSize)
			if (!binsGroup[bin]) {
				binsGroup[bin] = position.collateralValue
			} else {
				binsGroup[bin] += position.collateralValue
			}
		}
	}

	return Object.fromEntries(bins)
}

export async function getResponse(symbol: string, aggregateBy: 'protocol' | 'chain') {
	const sampleDbResponse: { [protocol: string]: Liq[] } = {
		liquity,
		euler,
		aave_v2,
		compound_v2
	}
	const allAggregated = await aggregateAssetAdapterData(sampleDbResponse)
	let positions: Position[]
	if (symbol === 'ETH') {
		const ethPositions = allAggregated.get('ETH')
		const wethPositions = allAggregated.get('WETH')
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	}
	positions = allAggregated.get(symbol)!.positions
	const currentPrice = allAggregated.get(symbol)!.currentPrice

	const chartDataBins = getChartDataBins(positions, currentPrice, TOTAL_BINS, aggregateBy)
	const chartData: ChartData = {
		symbol,
		currentPrice,
		lendingDominance: await getLendingDominance(symbol),
		historicalChange: { 168: await getHistoricalChange(symbol, 168) },
		totalLiquidable: await getTotalLiquidable(symbol),
		chartDataBins,
		totalBins: TOTAL_BINS,
		binSize: currentPrice / TOTAL_BINS
	}

	return chartData
	// example response with ('ETH', 'protocol') could be:
	// {
	// 	symbol: 'ETH',
	// 	currentPrice: 2000,
	// 	lendingDominance: 0.69,
	// 	historicalChange: {
	// 		168: -0.42
	// 	},
	// 	totalLiquidable: 69_000_000_000,
	// 	chartDataBins: {
	// 		liquity: {
	// 			bins: {
	// 				0: 1234,
	// 				500: 2345,
	// 				1500: 3456,
	// 				2000: 4321,
	//      },
	//      binSize: 500,
	//      price: 2000
	// 		},
	// 		euler: {
	// 			bins: {
	// 				0: 1234,
	// 				500: 2345,
	// 				1500: 3456,
	// 				2000: 4321,
	//      },
	//      binSize: 500,
	//      price: 2000
	// 		},
	//  },
	// }
}
