/* eslint-disable no-unused-vars*/
import type { ISearchItem } from '~/components/Search/types'
import { LIQUIDATIONS_HISTORICAL_R2_PATH } from '~/constants'
import { liquidationsIconUrl } from '..'
import { fetchWithErrorLogging } from '../async'

const fetch = fetchWithErrorLogging

/**
 * Format the URL to the liquidations data payload
 *
 * @param symbol The symbol of the asset to fetch liquidations for
 * @param timestamp UNIX timestamp in **seconds**
 * @returns The URL to the liquidations data payload
 */
const getDataUrl = (symbol: string, timestamp: number) => {
	const hourId = Math.floor(timestamp / 3600 / 6) * 6
	return `${LIQUIDATIONS_HISTORICAL_R2_PATH}/${symbol.toLowerCase()}/${hourId}.json`
}

const getAvailability = async () => {
	const res = await fetch(`${LIQUIDATIONS_HISTORICAL_R2_PATH}/availability.json`)
	const data = await res.json()
	return data as { availability: { [symbol: string]: number }; time: number }
}

const TOTAL_BINS = 100
const WRAPPED_GAS_TOKENS = ['WETH', 'WAVAX', 'WMATIC', 'WFTM', 'WBNB', 'WCRO', 'WONE']
const SYMBOL_MAP: { [originSymbol: string]: string } = { BTCB: 'WBTC', BTC: 'WBTC' }

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
	if (symbol in SYMBOL_MAP) {
		return SYMBOL_MAP[symbol].toLowerCase()
	}

	const originSymbol =
		symbol.toLowerCase().endsWith('.e') || symbol.toLowerCase().endsWith('.b') ? symbol.slice(0, -2) : symbol
	const nativeSymbol = WRAPPED_GAS_TOKENS.includes(originSymbol) ? originSymbol.substring(1) : originSymbol
	return nativeSymbol.toLowerCase()
}

export type ChartData = {
	name: string
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

export async function getAvailableAssetsList() {
	const { availability, time } = await getAvailability()
	const assets = DEFAULT_ASSETS_LIST.filter((asset) => {
		return !!availability[asset.symbol.toLowerCase()]
	})

	return { assets, time }
}

interface LiquidationsData {
	symbol: string
	currentPrice: number
	positions: Position[]
	time: number
}

const disabledProtocols = []

export async function getPrevChartData(symbol: string, totalBins = TOTAL_BINS, timePassed = 0) {
	const now = Math.round(Date.now() / 1000) // in seconds
	const LIQUIDATIONS_DATA_URL = getDataUrl(symbol, now - timePassed)

	let data: LiquidationsData
	try {
		const res = await fetch(LIQUIDATIONS_DATA_URL)
		data = await res.json()
	} catch (e) {
		// fallback to current
		const res = await fetch(`${LIQUIDATIONS_HISTORICAL_R2_PATH}/${symbol.toLowerCase()}/latest.json`)
		data = await res.json()
	}

	const currentPrice = data.currentPrice
	const positions = data.positions.filter((p) => !disabledProtocols.includes(p.protocol))

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
		name: DEFAULT_ASSETS_LIST.find((a) => a.symbol.toLowerCase() === symbol.toLowerCase())?.name ?? symbol,
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
		time: data.time,
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
	const now = Math.round(Date.now() / 1000) // in seconds
	const LIQUIDATIONS_DATA_URL = getDataUrl(symbol, now)

	const res = await fetch(LIQUIDATIONS_DATA_URL)
	const data = (await res.json()) as LiquidationsData

	const timestamp = data.time
	const positions = data.positions
	const allAssetPositions = positions
		.filter((p) => p.liqPrice < data.currentPrice && p.collateralValue > 0)
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
		name: 'Binance Coin',
		symbol: 'BNB'
	},
	{
		name: 'USD Coin',
		symbol: 'USDC'
	},
	{
		name: 'Lido Staked ETH',
		symbol: 'STETH'
	},
	{
		name: 'Lido Wrapped stETH',
		symbol: 'WSTETH'
	},
	// {
	// 	name: 'Binance Beacon ETH',
	// 	symbol: 'BETH'
	// },
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
		name: 'Solar Network',
		symbol: 'SXP'
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
		name: 'PancakeSwap',
		symbol: 'CAKE'
	},
	{
		name: 'Cardano',
		symbol: 'ADA'
	},
	{
		name: 'Basic Attention',
		symbol: 'BAT'
	},
	{
		name: 'Binance USD',
		symbol: 'BUSD'
	},
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
		name: 'Tezos',
		symbol: 'XTZ'
	},
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
		name: 'Optimism',
		symbol: 'OP'
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
	route: `/liquidations/${symbol.toLowerCase()}`,
	logo: liquidationsIconUrl(symbol.toLowerCase())
}))

export const PROTOCOL_NAMES_MAP = {
	'aave-v2': 'Aave V2',
	compound: 'Compound',
	euler: 'Euler',
	liquity: 'Liquity',
	maker: 'MakerDAO',
	'trader-joe-lend': 'Trader Joe',
	'mimo-protocol': 'Mimo',
	polygon: 'Polygon',
	ethereum: 'Ethereum',
	avalanche: 'Avalanche',
	solend: 'Solend',
	solana: 'Solana',
	benqi: 'Benqi',
	venus: 'Venus',
	bsc: 'BSC',
	angle: 'Angle',
	optimism: 'Optimism',
	arbitrum: 'Arbitrum'
} as const

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
