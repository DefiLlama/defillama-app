import { LIQUIDATIONS_HISTORICAL_R2_PATH } from '~/constants'
import { fetchJson } from '~/utils/async'
import { PROTOCOL_NAMES_MAP, SYMBOL_MAP, WRAPPED_GAS_TOKENS } from './constants'

/**
 * Format the URL to the liquidations data payload
 *
 * @param symbol The symbol of the asset to fetch liquidations for
 * @param timestamp UNIX timestamp in **seconds**
 * @returns The URL to the liquidations data payload
 */
export const getDataUrl = (symbol: string, timestamp: number) => {
	const hourId = Math.floor(timestamp / 3600 / 6) * 6
	return `${LIQUIDATIONS_HISTORICAL_R2_PATH}/${symbol.toLowerCase()}/${hourId}.json`
}

// making aliases so the hints are more readable
type Address = string
type PrefixAddress = string
type Chain = string
type Protocol = string

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

const _getNativeSymbol = (symbol: string) => {
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

type LiquidationsChartSeries = {
	key: string
	label: string
	usd: number[]
	native: number[]
}

export type LiquidationsChartSeriesByGroup = {
	protocols: {
		bins: number[]
		series: LiquidationsChartSeries[]
	}
	chains: {
		bins: number[]
		series: LiquidationsChartSeries[]
	}
}

export interface ChartDataBins {
	bins: {
		[bin: number]: { native: number; usd: number }
	}
	binSize: number
	price: number
}

// NOTE: `getLiquidationsAssetsList` is implemented server-side to use build-time `.cache`
// and avoid per-symbol network fan-out during ISR.

export interface LiquidationsData {
	symbol: string
	currentPrice: number
	positions: Position[]
	time: number
}

export const getLiquidationsCsvData = async (symbol: string) => {
	const now = Math.round(Date.now() / 1000) // in seconds
	const LIQUIDATIONS_DATA_URL = getDataUrl(symbol, now)

	const res = await fetchJson(LIQUIDATIONS_DATA_URL)
	const data = res as LiquidationsData

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

const convertChartDataBinsToArray = (obj: ChartDataBins, totalBins: number) => {
	// this line below suddenly throws error in browser that the iterator can't iterate??
	// const arr = [...Array(totalBins).keys()].map((i) => obj.bins[i] || 0)
	const arr = Array.from({ length: totalBins }, (_, i) => i).map((i) => obj.bins[i] || { native: 0, usd: 0 })
	return arr
}

export const buildLiquidationsChartSeries = (chartData: ChartData): LiquidationsChartSeriesByGroup => {
	const buildGroup = (stackBy: 'protocols' | 'chains') => {
		const chartDataBins = chartData.chartDataBins[stackBy]
		const liquidablesByGroup = chartData.totalLiquidables[stackBy]
		const keys = Object.keys(chartDataBins).sort((a, b) => {
			const aValue = liquidablesByGroup[a] ?? 0
			const bValue = liquidablesByGroup[b] ?? 0
			if (bValue !== aValue) return bValue - aValue
			return a.localeCompare(b)
		})

		const bins: number[] = []
		for (let i = 0; i < chartData.totalBins; i++) {
			bins.push(Number((i * chartData.binSize).toFixed(3)))
		}

		const series = keys.map((key) => {
			const label = PROTOCOL_NAMES_MAP[key] ?? key
			const values = convertChartDataBinsToArray(chartDataBins[key], chartData.totalBins)
			const usd = new Array(values.length)
			const native = new Array(values.length)
			for (let i = 0; i < values.length; i++) {
				usd[i] = values[i].usd
				native[i] = values[i].native
			}
			return { key, label, usd, native }
		})

		return { bins, series }
	}

	return {
		protocols: buildGroup('protocols'),
		chains: buildGroup('chains')
	}
}
