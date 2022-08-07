/* eslint-disable no-unused-vars*/
import BigNumber from 'bignumber.js'
import { DropdownOption } from '~/components/LiquidationsPage/Dropdowns'
import { queryTypes, useQueryState } from 'next-usequerystate'
import { defaultChartState } from '~/components/LiquidationsPage/utils'

const TOTAL_BINS = 120

export interface Liq {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: string
}

export interface Position {
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

async function getHistoricalChange(symbol: string, hours: number) {
	// TODO: implement on backend
	return -0.42
}

export type ChartData = {
	symbol: string // could change to coingeckoId in the future
	coingeckoAsset: CoingeckoAsset // i know theres repeated data but will improve later
	currentPrice: number
	totalLiquidable: number // including bad debts
	badDebts: number
	historicalChange: {
		[hours: number]: number // 1h, 6h, 12h, 1d, 7d, 30d etc in ratio
	}
	dangerousPositionsAmount: number // amount of -20% current price
	chartDataBins: { [bin: string]: ChartDataBin }
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

interface LiquidationsApiResponse {
	time: number
	data: {
		protocol: string
		liqs: {
			[chain: string]: Liq[]
		}
	}[]
}

export async function getResponse(symbol: string, aggregateBy: 'protocol' | 'chain', totalBins = TOTAL_BINS) {
	const raw = (await fetch(`https://coins.llama.fi/liquidations`).then((r) => r.json())) as LiquidationsApiResponse
	const protocols = raw.data.map((d) => d.protocol)
	const chains = [...new Set(raw.data.flatMap((d) => Object.keys(d.liqs)))]

	const adapterData: { [protocol: string]: Liq[] } = raw.data.reduce(
		(acc, d) => ({ ...acc, [d.protocol]: d.liqs[chains[0]] }),
		{}
	)
	const allAggregated = await aggregateAssetAdapterData(adapterData)
	let positions: Position[]
	// handle other wrapped gas tokens later dynamically
	if (symbol === 'ETH') {
		const ethPositions = allAggregated.get('ETH')
		const wethPositions = allAggregated.get('WETH')
		positions = [...ethPositions!.positions, ...wethPositions!.positions]
	} else {
		positions = allAggregated.get(symbol)!.positions
	}
	const currentPrice = allAggregated.get(symbol)!.currentPrice

	let badDebts = 0
	let totalLiquidable = 0
	let dangerousPositionsAmount = 0
	const validPositions = positions.filter((p) => {
		totalLiquidable += p.collateralValue
		if (p.liqPrice > currentPrice) {
			badDebts += p.collateralValue
			return false
		}
		if (p.liqPrice > currentPrice * 0.8 && p.liqPrice <= currentPrice) {
			dangerousPositionsAmount += p.collateralValue
		}
		return true
	})

	const chartDataBins = getChartDataBins(validPositions, currentPrice, totalBins, aggregateBy)
	const coingeckoAsset = await getCoingeckoAssetFromSymbol(symbol)
	const chartData: ChartData = {
		symbol,
		coingeckoAsset,
		currentPrice,
		badDebts,
		dangerousPositionsAmount,
		historicalChange: { 168: await getHistoricalChange(symbol, 168) },
		totalLiquidable,
		totalBins,
		chartDataBins,
		binSize: currentPrice / totalBins,
		availability: {
			protocols,
			chains
		},
		time: raw.time
	}

	return chartData
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

export function useLiquidationsState() {
	const [asset, setAsset] = useQueryState('asset', queryTypes.string.withDefault(defaultChartState.asset))
	const [aggregateBy, setAggregateBy] = useQueryState(
		'aggregateBy',
		queryTypes.stringEnum(['protocol', 'chain']).withDefault(defaultChartState.aggregateBy)
	)
	const [filters, setFilters] = useQueryState('filters', {
		parse: (query: string) => {
			if (!query) {
				return ['all']
			}
			if (query.includes('none')) {
				return ['none']
			}
			const parsed = query.split(',').filter((x) => !!x)
			const deduped = [...new Set(parsed)]
			return deduped
		},
		serialize: (value: string[]) => value.join(',')
	})

	return { asset, setAsset, aggregateBy, setAggregateBy, filters: filters ?? ['all'], setFilters }
}
