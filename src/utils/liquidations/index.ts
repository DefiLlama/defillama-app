/* eslint-disable no-unused-vars*/
import BigNumber from 'bignumber.js'
import { IBaseSearchProps, ISearchItem } from '~/components/Search/BaseSearch'
import { LIQUIDATIONS_API, LIQUIDATIONS_HISTORICAL_S3_PATH } from '~/constants'

const TOTAL_BINS = 100
const WRAPPABLE_GAS_TOKENS = ['ETH', 'AVAX', 'MATIC', 'FTM', 'BNB', 'CRO', 'ONE']

export interface Liq {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: string
}

export interface Position {
	owner: string
	liqPrice: number
	collateralValue: number
	chain: string
	protocol: string // protocol adapter id, like "aave-v2", "liquity"...
}

export type Price = {
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
		liqs.forEach(({ liqPrice, collateral, collateralAmount, owner }) => {
			const chain = collateral.split(':')[0]
			if (!prices[collateral]) {
				// console.error(`Token not supported by price API ${collateral}`)
				return
			}
			const { symbol, decimals, price: currentPrice } = prices[collateral]
			const position: Position = {
				owner,
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

export type ChartData = {
	symbol: string // could change to coingeckoId in the future
	coingeckoAsset: CoingeckoAsset // i know theres repeated data but will improve later
	currentPrice: number
	totalLiquidable: number // excluding bad debts
	totalLiquidables: {
		protocols: { [protocol: string]: number }
		chains: { [chain: string]: number }
	}
	badDebts: number
	dangerousPositionsAmount: number // amount of -20% current price
	chartDataBins: {
		// aggregated by either protocol or chain
		byProtocol: { [bin: string]: ChartDataBin }
		byChain: { [bin: string]: ChartDataBin }
	}
	totalBins: number
	binSize: number
	availability: {
		protocols: string[]
		chains: string[]
	}
	time: number
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
	stackBy: 'protocol' | 'chain'
): { [bin: string]: ChartDataBin } {
	// protocol/chain -> {bins, binSize, price}
	const aggregatedPositions = new Map<string, Position[]>()
	const keySet = new Set<string>()

	// group positions by protocol or chain
	for (const position of positions) {
		keySet.add(position[stackBy])
		let positionsGroup: Position[] = aggregatedPositions.get(position[stackBy])
		if (!positionsGroup) {
			positionsGroup = [position]
			aggregatedPositions.set(position[stackBy], positionsGroup)
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

export interface LiquidationsApiResponse {
	time: number
	data: {
		protocol: string
		liqs: {
			[chain: string]: Liq[]
		}
	}[]
}

export async function getPrevChartData(symbol: string, totalBins = TOTAL_BINS, timePassed = 0) {
	const now = Math.round(Date.now() / 1000) // in seconds
	const LIQUIDATIONS_DATA_URL =
		timePassed === 0
			? LIQUIDATIONS_API
			: LIQUIDATIONS_HISTORICAL_S3_PATH + `/${Math.floor((now - timePassed) / 3600)}.json`

	let raw: LiquidationsApiResponse
	try {
		const res = await fetch(LIQUIDATIONS_DATA_URL)
		raw = await res.json()
	} catch (e) {
		// fallback to current
		const res = await fetch(LIQUIDATIONS_API)
		raw = await res.json()
	}

	const adapterChains = [...new Set(raw.data.flatMap((d) => Object.keys(d.liqs)))]
	const adapterData: { [protocol: string]: Liq[] } = raw.data.reduce(
		(acc, d) => ({ ...acc, [d.protocol]: d.liqs[adapterChains[0]] }),
		{}
	)
	const allAggregated = await aggregateAssetAdapterData(adapterData)
	let positions: Position[]
	// handle wrapped gas tokens later dynamically
	let nativeSymbol = symbol
	if (WRAPPABLE_GAS_TOKENS.includes(symbol.toUpperCase())) {
		const ethPositions = allAggregated.get(nativeSymbol)
		const wethPositions = allAggregated.get('W' + nativeSymbol)
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	} else if (WRAPPABLE_GAS_TOKENS.includes(symbol.toUpperCase().substring(1))) {
		nativeSymbol = symbol.toUpperCase().substring(1)
		const ethPositions = allAggregated.get(nativeSymbol)
		const wethPositions = allAggregated.get('W' + nativeSymbol)
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	} else {
		positions = allAggregated.get(symbol)!.positions
	}
	const currentPrice = allAggregated.get(symbol)!.currentPrice

	let badDebts = 0
	let totalLiquidable = 0
	let dangerousPositionsAmount = 0
	const validPositions = positions.filter((p) => {
		if (p.liqPrice > currentPrice) {
			badDebts += p.collateralValue
			return false
		}
		totalLiquidable += p.collateralValue
		if (p.liqPrice > currentPrice * 0.8 && p.liqPrice <= currentPrice) {
			dangerousPositionsAmount += p.collateralValue
		}
		return true
	})

	const chartDataBinsByProtocol = getChartDataBins(validPositions, currentPrice, totalBins, 'protocol')
	const protocols = Object.keys(chartDataBinsByProtocol)
	const liquidablesByProtocol = protocols.reduce((acc, protocol) => {
		acc[protocol] = Object.values(chartDataBinsByProtocol[protocol].bins).reduce((a, b) => a + b, 0)
		return acc
	}, {} as { [protocol: string]: number })

	const chartDataBinsByChain = getChartDataBins(validPositions, currentPrice, totalBins, 'chain')
	const chains = Object.keys(chartDataBinsByChain)
	const liquidablesByChain = chains.reduce((acc, chain) => {
		acc[chain] = Object.values(chartDataBinsByChain[chain].bins).reduce((a, b) => a + b, 0)
		return acc
	}, {} as { [chain: string]: number })

	const coingeckoAsset = await getCoingeckoAssetFromSymbol(nativeSymbol)
	const chartData: ChartData = {
		symbol: nativeSymbol,
		coingeckoAsset,
		currentPrice,
		badDebts,
		dangerousPositionsAmount,
		totalLiquidable,
		totalLiquidables: {
			chains: liquidablesByChain,
			protocols: liquidablesByProtocol
		},
		totalBins,
		chartDataBins: {
			byChain: chartDataBinsByChain,
			byProtocol: chartDataBinsByProtocol
		},
		binSize: currentPrice / totalBins,
		availability: {
			protocols,
			chains
		},
		time: raw.time
	}

	return chartData
}

export async function getLatestChartData(symbol: string, totalBins = TOTAL_BINS) {
	return await getPrevChartData(symbol, totalBins)
}

export type CoingeckoAsset = {
	id: string
	name: string
	symbol: string
	market_cap_rank: number
	thumb: string
	large: string
}

/**
 * Lookup asset by symbol in coingecko by using the search API. Returns the first result.
 *
 * @param symbol e.g. 'ETH'
 * @returns {CoingeckoAsset}
 */
export async function getCoingeckoAssetFromSymbol(symbol: string): Promise<CoingeckoAsset> {
	// search for the coin using coingecko api
	const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`).then((r) => r.json())
	const coins = res.coins as CoingeckoAsset[]

	return coins[0] ?? null
}

export function getReadableValue(value: number) {
	if (typeof value !== 'number' || isNaN(value) || value === 0) return '0'

	if (Math.abs(value) < 1000) {
		return value.toPrecision(4)
	}

	// https://crusaders-of-the-lost-idols.fandom.com/wiki/Large_Number_Abbreviations
	// llamao issa fun
	const s = ['', 'k', 'm', 'b', 't', 'q', 'Q', 's', 'S', 'o', 'n', 'd', 'U', 'D', 'T', 'Qt', 'Qd', 'Sd', 'St', 'O', 'N']
	const e = Math.floor(Math.log(value) / Math.log(1000))
	return (value / Math.pow(1000, e)).toFixed(1) + s[e]
}

export const getLiquidationsCsvData = async (symbol: string) => {
	const raw = (await fetch(LIQUIDATIONS_API).then((r) => r.json())) as LiquidationsApiResponse
	const timestamp = raw.time

	const adapterChains = [...new Set(raw.data.flatMap((d) => Object.keys(d.liqs)))]
	const adapterData: { [protocol: string]: Liq[] } = raw.data.reduce(
		(acc, d) => ({ ...acc, [d.protocol]: d.liqs[adapterChains[0]] }),
		{}
	)
	const allAggregated = await aggregateAssetAdapterData(adapterData)
	let positions: Position[]
	// handle wrapped gas tokens later dynamically
	let nativeSymbol = symbol
	if (WRAPPABLE_GAS_TOKENS.includes(symbol.toUpperCase())) {
		const ethPositions = allAggregated.get(nativeSymbol)
		const wethPositions = allAggregated.get('W' + nativeSymbol)
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	} else if (WRAPPABLE_GAS_TOKENS.includes(symbol.toUpperCase().substring(1))) {
		nativeSymbol = symbol.toUpperCase().substring(1)
		const ethPositions = allAggregated.get(nativeSymbol)
		const wethPositions = allAggregated.get('W' + nativeSymbol)
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	} else {
		positions = allAggregated.get(symbol)!.positions
	}

	const allAssetPositions = positions
		.filter((p) => p.liqPrice < allAggregated.get(symbol)!.currentPrice && p.collateralValue > 0)
		.map((p) => ({
			...p,
			symbol
		}))

	const csvHeader = ['symbol', 'chain', 'protocol', 'liqPrice', 'collateralValue', 'owner', 'timestamp'].join(',')
	const csvData = allAssetPositions
		.map(({ symbol, chain, protocol, liqPrice, collateralValue, owner }) => {
			return `${symbol},${chain},${protocol},${liqPrice},${collateralValue},${owner},${timestamp}`
		})
		.reduce((acc, curr) => acc + '\n' + curr, csvHeader)

	return csvData
}

export const DEFAULT_ASSETS_LIST: ISearchItem[] = [
	{
		logo: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
		route: '/liquidations/eth',
		name: 'Ethereum',
		symbol: 'ETH'
	},
	{
		logo: 'https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png',
		route: '/liquidations/wbtc',
		name: 'Wrapped Bitcoin',
		symbol: 'WBTC'
	},
	{
		logo: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
		route: '/liquidations/usdc',
		name: 'USD Coin',
		symbol: 'USDC'
	},
	{
		logo: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png',
		route: '/liquidations/dai',
		name: 'Dai',
		symbol: 'DAI'
	},
	{
		logo: 'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png',
		route: '/liquidations/yfi',
		name: 'yearn.finance',
		symbol: 'YFI'
	},
	{
		logo: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png',
		route: '/liquidations/uni',
		name: 'Uniswap',
		symbol: 'UNI'
	}
]
