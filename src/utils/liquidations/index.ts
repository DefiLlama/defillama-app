/* eslint-disable no-unused-vars*/
import BigNumber from 'bignumber.js'
import type { ISearchItem } from '~/components/Search/types'
import { LIQUIDATIONS_API, LIQUIDATIONS_HISTORICAL_S3_PATH } from '~/constants'
import { assetIconUrl } from '..'

const TOTAL_BINS = 100
const WRAPPED_GAS_TOKENS = ['WETH', 'WAVAX', 'WMATIC', 'WFTM', 'WBNB', 'WCRO', 'WONE']

// making aliases so the hints are more readable
type Address = string
type PrefixAddress = string
type Chain = string
type Protocol = string
type Symbol = string

export interface Liq {
	owner: Address
	liqPrice: number
	collateral: PrefixAddress
	collateralAmount: string
	extra?: {
		displayName?: string
		url: string
	}
}

export interface Position {
	owner: Address
	liqPrice: number
	collateralValue: number
	collateralAmount: number
	chain: Chain
	protocol: Protocol // protocol adapter id, like "aave-v2", "liquity"...
	collateral: PrefixAddress // token address formatted as "ethereum:0x1234..."
	displayName?: string
	url: string
}

export type PositionSmol = Omit<Position, 'collateral' | 'owner'>

export type Price = {
	decimals: number
	price: number
	symbol: Symbol
	timestamp: number
	address: PrefixAddress
	chain: Chain
}

const getNativeSymbol = (symbol: string) => {
	const originSymbol =
		symbol.toLowerCase().endsWith('.e') || symbol.toLowerCase().endsWith('.b') ? symbol.slice(0, -2) : symbol
	const nativeSymbol = WRAPPED_GAS_TOKENS.includes(originSymbol) ? originSymbol.substring(1) : originSymbol
	return nativeSymbol.toLowerCase()
}

/**
 * Transform the output of multiple adapters to a single data structure aggregated by assets
 *
 */
async function aggregateAssetAdapterData(filteredAdapterOutput: { [protocol: Protocol]: Liq[] }) {
	const protocols = Object.keys(filteredAdapterOutput)

	// go thru all entries first to find all Collaterals (can be optimized but will be fine for now)
	const knownTokens = new Set<PrefixAddress>()
	for (const protocol of protocols) {
		filteredAdapterOutput[protocol].forEach((liq) => knownTokens.add(liq.collateral.toLowerCase()))
	}

	const prices = await getPrices(Array.from(knownTokens))
	const aggregatedData: Map<Symbol, { currentPrice: number; positions: Position[] }> = new Map()
	for (const price of prices) {
		const symbol = getNativeSymbol(price.symbol)
		if (!aggregatedData.has(symbol)) {
			aggregatedData.set(symbol, {
				currentPrice: price.price,
				positions: []
			})
		}
	}

	for (const protocol of protocols) {
		const adapterData = filteredAdapterOutput[protocol]
		for (const liq of adapterData) {
			const price = prices.find((price) => price.address === liq.collateral.toLowerCase())
			if (!price) {
				continue
			}

			const collateralAmountRaw = new BigNumber(liq.collateralAmount).div(10 ** price.decimals)

			const symbol = getNativeSymbol(price.symbol)
			aggregatedData.get(symbol)!.positions.push({
				owner: liq.owner,
				liqPrice: liq.liqPrice,
				collateralValue: collateralAmountRaw.times(liq.liqPrice).toNumber(),
				collateralAmount: collateralAmountRaw.toNumber(),
				chain: price.chain,
				protocol: protocol,
				collateral: liq.collateral.toLowerCase(),
				displayName: liq.extra?.displayName ?? liq.owner,
				url: liq.extra?.url
			})
		}
	}

	for (const symbol in aggregatedData.keys()) {
		// array.sort is in place
		aggregatedData.get(symbol)!.positions.sort((a, b) => b.collateralValue - a.collateralValue)
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
	const _prices = data.coins as {
		[address: string]: {
			decimals: number
			price: number
			symbol: string
			timestamp: number
		}
	}
	const prices: Price[] = Object.entries(_prices).map(([address, price]) => {
		const _chain = address.split(':')[0]
		const chain = _chain === 'avax' ? 'avalanche' : _chain
		return {
			...price,
			address,
			chain
		}
	})
	return prices
}

export type ChartData = {
	symbol: string // could change to coingeckoId in the future
	currentPrice: number
	totalLiquidable: number // excluding bad debts
	totalLiquidables: {
		protocols: { [protocol: string]: number }
		chains: { [chain: string]: number }
	}
	badDebts: number
	dangerousPositionsAmount: number // amount of -20% current price
	dangerousPositionsAmounts: {
		protocols: { [protocol: string]: number }
		chains: { [chain: string]: number }
	}
	chartDataBins: {
		// aggregated by either protocol or chain
		protocols: { [protocol: string]: ChartDataBins }
		chains: { [chain: string]: ChartDataBins }
	}
	totalBins: number
	binSize: number
	availability: {
		protocols: string[]
		chains: string[]
	}
	time: number
	topPositions: PositionSmol[]
	totalPositions: number
}

export interface ChartDataBins {
	bins: {
		[bin: number]: { native: number; usd: number }
	}
	binSize: number
	price: number
}

function getChartDataBins(
	positions: Position[],
	currentPrice: number,
	totalBins: number,
	stackBy: 'protocol' | 'chain'
): { [key: string]: ChartDataBins } {
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
			const bin = Math.floor(position.liqPrice / binSize)
			if (!binsGroup[bin]) {
				binsGroup[bin] = { native: 0, usd: 0 }
			}
			binsGroup[bin] = {
				native: binsGroup[bin].native + position.collateralAmount,
				usd: binsGroup[bin].usd + position.collateralValue
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
			: LIQUIDATIONS_HISTORICAL_S3_PATH + `/${Math.floor((now - timePassed) / 3600 / 6) * 6}.json`

	let raw: LiquidationsApiResponse
	try {
		const res = await fetch(LIQUIDATIONS_DATA_URL)
		raw = await res.json()
	} catch (e) {
		// fallback to current
		const res = await fetch(LIQUIDATIONS_API)
		raw = await res.json()
	}

	const adapterData: { [protocol: string]: Liq[] } = raw.data.reduce(
		(acc, d) => ({ ...acc, [d.protocol]: Object.values(d.liqs).flat() }),
		{}
	)
	const allAggregated = await aggregateAssetAdapterData(adapterData)
	if (!allAggregated.has(symbol)) {
		// no data for this symbol, will happen when historical data is not available for this asset
		return null
	}

	const currentPrice = allAggregated.get(symbol)!.currentPrice
	const positions = allAggregated.get(symbol)!.positions

	const badDebtsPositions = positions.filter((p) => p.liqPrice > currentPrice)
	const badDebts = badDebtsPositions.reduce((acc, p) => acc + p.collateralValue, 0)

	const validPositions = positions.filter((p) => p.liqPrice <= currentPrice && p.liqPrice > currentPrice / 1000000)
	const totalLiquidable = validPositions.reduce((acc, p) => acc + p.collateralValue, 0)

	const chartDataBinsByProtocol = getChartDataBins(validPositions, currentPrice, totalBins, 'protocol')
	const protocols = Object.keys(chartDataBinsByProtocol)
	const liquidablesByProtocol = protocols.reduce((acc, protocol) => {
		acc[protocol] = Object.values(chartDataBinsByProtocol[protocol].bins).reduce((a, b) => a + b['usd'], 0)
		return acc
	}, {} as { [protocol: string]: number })

	const chartDataBinsByChain = getChartDataBins(validPositions, currentPrice, totalBins, 'chain')
	const chains = Object.keys(chartDataBinsByChain)
	const liquidablesByChain = chains.reduce((acc, chain) => {
		acc[chain] = Object.values(chartDataBinsByChain[chain].bins).reduce((a, b) => a + b['usd'], 0)
		return acc
	}, {} as { [chain: string]: number })

	const dangerousPositions = validPositions.filter((p) => p.liqPrice > currentPrice * 0.8 && p.liqPrice <= currentPrice)
	const dangerousPositionsAmount = dangerousPositions.reduce((acc, p) => acc + p.collateralValue, 0)
	const dangerousPositionsAmountByProtocol = protocols.reduce((acc, protocol) => {
		acc[protocol] = dangerousPositions.filter((p) => p.protocol === protocol).reduce((a, p) => a + p.collateralValue, 0)
		return acc
	}, {} as { [protocol: string]: number })
	const dangerousPositionsAmountByChain = chains.reduce((acc, chain) => {
		acc[chain] = dangerousPositions.filter((p) => p.chain === chain).reduce((a, p) => a + p.collateralValue, 0)
		return acc
	}, {} as { [chain: string]: number })

	const topPositions = [...validPositions]
		.sort((a, b) => b.collateralValue - a.collateralValue)
		.slice(0, 100) // hardcoded to first 100
		.map((p) => ({
			liqPrice: p.liqPrice,
			collateralAmount: p.collateralAmount,
			collateralValue: p.collateralValue,
			protocol: p.protocol,
			chain: p.chain,
			url: p?.url ?? null,
			displayName: p?.displayName ?? null
		}))

	const chartData: ChartData = {
		symbol,
		currentPrice,
		badDebts,
		dangerousPositionsAmount,
		dangerousPositionsAmounts: {
			chains: dangerousPositionsAmountByChain,
			protocols: dangerousPositionsAmountByProtocol
		},
		totalLiquidable,
		totalLiquidables: {
			chains: liquidablesByChain,
			protocols: liquidablesByProtocol
		},
		totalBins,
		chartDataBins: {
			chains: sortObject(
				chartDataBinsByChain,
				([keyA, a], [keyB, b]) => liquidablesByChain[keyB] - liquidablesByChain[keyA]
			),
			protocols: sortObject(
				chartDataBinsByProtocol,
				([keyA, a], [keyB, b]) => liquidablesByProtocol[keyB] - liquidablesByProtocol[keyA]
			)
		},
		binSize: currentPrice / totalBins,
		availability: {
			protocols,
			chains
		},
		time: raw.time,
		topPositions,
		totalPositions: validPositions.length
	}

	return chartData
}

export async function getLatestChartData(symbol: string, totalBins = TOTAL_BINS) {
	return await getPrevChartData(symbol, totalBins)
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

	const adapterData: { [protocol: string]: Liq[] } = raw.data.reduce(
		(acc, d) => ({ ...acc, [d.protocol]: Object.values(d.liqs).flat() }),
		{}
	)
	const allAggregated = await aggregateAssetAdapterData(adapterData)
	if (!allAggregated.has(symbol)) {
		// no data for this symbol, will happen when historical data is not available for this asset
		return null
	}

	const positions = allAggregated.get(symbol)!.positions
	const allAssetPositions = positions
		.filter((p) => p.liqPrice < allAggregated.get(symbol)!.currentPrice && p.collateralValue > 0)
		.map((p) => ({
			...p,
			symbol
		}))

	const csvHeader = [
		'symbol',
		'chain',
		'protocol',
		'liqPrice',
		'collateralValue',
		'collateralAmount',
		'owner',
		'timestamp'
	].join(',')
	const csvData = allAssetPositions
		.map(({ symbol, chain, protocol, liqPrice, collateralValue, collateralAmount, owner }) => {
			return `${symbol.toUpperCase()},${chain},${protocol},${liqPrice},${collateralValue},${collateralAmount},${owner},${timestamp}`
		})
		.reduce((acc, curr) => acc + '\n' + curr, csvHeader)

	return csvData
}

export const DEFAULT_ASSETS_LIST_RAW: { name: string; symbol: string }[] = [
	{
		name: 'Ethereum',
		symbol: 'ETH'
	},
	{
		name: 'Wrapped Bitcoin',
		symbol: 'WBTC'
	},
	{
		name: 'Dai',
		symbol: 'DAI'
	},
	{
		name: 'Solana',
		symbol: 'SOL'
	},
	{
		name: 'USD Coin',
		symbol: 'USDC'
	},
	{
		name: 'Lido Wrapped stETH',
		symbol: 'WSTETH'
	},
	{
		name: 'Lido Staked SOL',
		symbol: 'STSOL'
	},
	{
		name: 'Marinade Staked SOL',
		symbol: 'MSOL'
	},
	{
		name: 'Tether',
		symbol: 'USDT'
	},
	{
		name: 'yearn.finance',
		symbol: 'YFI'
	},
	{
		name: 'FTX Token',
		symbol: 'FTT'
	},
	// {
	// 	name: 'Compound',
	// 	symbol: 'COMP'
	// },
	{
		name: 'Uniswap',
		symbol: 'UNI'
	},
	{
		name: 'Basic Attention',
		symbol: 'BAT'
	},
	// {
	// 	name: 'Binance USD',
	// 	symbol: 'BUSD'
	// },
	{
		name: 'Curve DAO',
		symbol: 'CRV'
	},
	// {
	// 	name: 'Ampleforth',
	// 	symbol: 'AMPL'
	// },
	{
		name: 'ChainLink',
		symbol: 'LINK'
	},
	// {
	// 	name: 'Frax',
	// 	symbol: 'FRAX'
	// },
	// {
	// 	name: 'Fei USD',
	// 	symbol: 'FEI'
	// },
	{
		name: 'TrueUSD',
		symbol: 'TUSD'
	},
	{
		name: 'Aave',
		symbol: 'AAVE'
	},
	{
		name: 'MakerDAO',
		symbol: 'MKR'
	},
	{
		name: 'Avalanche',
		symbol: 'AVAX'
	},
	{
		name: 'Polygon',
		symbol: 'MATIC'
	},
	{
		name: 'SushiSwap',
		symbol: 'SUSHI'
	},
	{
		name: 'Synthetix',
		symbol: 'SNX'
	},
	{
		name: 'Trader Joe',
		symbol: 'JOE'
	},
	{
		name: 'Magic Internet Money',
		symbol: 'MIM'
	},
	{
		name: '0x',
		symbol: 'ZRX'
	},
	{
		name: 'Enjin Coin',
		symbol: 'ENJ'
	},
	{
		name: 'Decentraland',
		symbol: 'MANA'
	},
	{
		name: '1inch',
		symbol: '1INCH'
	},
	// {
	// 	name: 'Rai Reflex Index',
	// 	symbol: 'RAI'
	// },
	{
		name: 'REN',
		symbol: 'REN'
	}
]

export const DEFAULT_ASSETS_LIST: ISearchItem[] = DEFAULT_ASSETS_LIST_RAW.map(({ name, symbol }) => ({
	name,
	symbol,
	route: `/liquidations/${symbol}`,
	logo: assetIconUrl(symbol)
}))

export const PROTOCOL_NAMES_MAP: { [protocol: string]: string } = {
	'aave-v2': 'Aave V2',
	compound: 'Compound',
	euler: 'Euler',
	liquity: 'Liquity',
	maker: 'MakerDAO',
	traderjoe: 'Trader Joe',
	polygon: 'Polygon',
	ethereum: 'Ethereum',
	avalanche: 'Avalanche',
	solend: 'Solend',
	solana: 'Solana'
}

export const PROTOCOL_NAMES_MAP_REVERSE: { [name: string]: string } = Object.entries(PROTOCOL_NAMES_MAP).reduce(
	(acc, [key, value]) => ({ ...acc, [value]: key }),
	{}
)

export const sortObject = <T>(
	unordered: { [key: string]: T },
	compareFn: (a: [string, T], b: [string, T]) => number
) => {
	return Object.entries(unordered)
		.sort(([keyA, valueA], [keyB, valueB]) => compareFn([keyA, valueA], [keyB, valueB]))
		.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
}
