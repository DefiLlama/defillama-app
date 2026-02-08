import { LIQUIDATIONS_HISTORICAL_R2_PATH } from '~/constants'
import { fetchJson } from '~/utils/async'
import { DEFAULT_ASSETS_LIST, LIQUIDATIONS_TOTAL_BINS } from './constants'
import { getDataUrl } from './utils'
import type { ChartData, ChartDataBins, LiquidationsData, Position, PositionSmol } from './utils'

const getAvailability = async () => {
	const res = await fetchJson(`${LIQUIDATIONS_HISTORICAL_R2_PATH}/availability.json`)
	return res as { availability: Record<string, number>; time: number }
}

export async function getLiquidationsAssetsList() {
	const { availability, time } = await getAvailability()
	const assets = DEFAULT_ASSETS_LIST.filter((asset) => !!availability[asset.symbol.toLowerCase()])
	// Keep the order from `constants.ts` (you can periodically refresh it with the updater script).
	return { assets, time }
}

function getChartDataBins(
	positions: Position[],
	currentPrice: number,
	totalBins: number,
	stackBy: 'protocol' | 'chain'
): { [key: string]: ChartDataBins } {
	const aggregatedPositions = new Map<string, Position[]>()
	const keySet = new Set<string>()

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
	for (const key of keySet) {
		bins.set(key, {
			bins: {},
			binSize: currentPrice / totalBins,
			price: currentPrice
		})
	}

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

const sortObject = <T>(unordered: { [key: string]: T }, compareFn: (a: [string, T], b: [string, T]) => number) => {
	return Object.entries(unordered)
		.sort(([keyA, valueA], [keyB, valueB]) => compareFn([keyA, valueA], [keyB, valueB]))
		.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
}

const disabledProtocols: string[] = []

export async function getPrevLiquidationsChartData(
	symbol: string,
	totalBins = LIQUIDATIONS_TOTAL_BINS,
	timePassed = 0
) {
	const now = Math.round(Date.now() / 1000) // in seconds
	const LIQUIDATIONS_DATA_URL = getDataUrl(symbol, now - timePassed)

	let data: LiquidationsData
	try {
		const res = await fetchJson(LIQUIDATIONS_DATA_URL)
		data = res
	} catch {
		const res = await fetchJson(`${LIQUIDATIONS_HISTORICAL_R2_PATH}/${symbol.toLowerCase()}/latest.json`)
		data = res
	}

	const currentPrice = data.currentPrice
	const positions = data.positions.filter((p) => !disabledProtocols.includes(p.protocol))

	const badDebtsPositions = positions.filter((p) => p.liqPrice > currentPrice)
	const badDebts = badDebtsPositions.reduce((acc, p) => acc + p.collateralValue, 0)

	const validPositions = positions.filter((p) => p.liqPrice <= currentPrice && p.liqPrice > currentPrice / 1000000)
	const totalLiquidable = validPositions.reduce((acc, p) => acc + p.collateralValue, 0)

	const chartDataBinsByProtocol = getChartDataBins(validPositions, currentPrice, totalBins, 'protocol')
	const protocols: string[] = []
	const liquidablesByProtocol: Record<string, number> = {}
	for (const protocol in chartDataBinsByProtocol) {
		protocols.push(protocol)
		let sum = 0
		for (const binKey in chartDataBinsByProtocol[protocol].bins) {
			sum += chartDataBinsByProtocol[protocol].bins[binKey]['usd']
		}
		liquidablesByProtocol[protocol] = sum
	}

	const chartDataBinsByChain = getChartDataBins(validPositions, currentPrice, totalBins, 'chain')
	const chains: string[] = []
	const liquidablesByChain: Record<string, number> = {}
	for (const chain in chartDataBinsByChain) {
		chains.push(chain)
		let sum = 0
		for (const binKey in chartDataBinsByChain[chain].bins) {
			sum += chartDataBinsByChain[chain].bins[binKey]['usd']
		}
		liquidablesByChain[chain] = sum
	}

	const dangerousPositions = validPositions.filter((p) => p.liqPrice > currentPrice * 0.8 && p.liqPrice <= currentPrice)
	let dangerousPositionsAmount = 0
	const dangerousPositionsAmountByProtocol: Record<string, number> = {}
	const dangerousPositionsAmountByChain: Record<string, number> = {}
	for (const protocol of protocols) {
		dangerousPositionsAmountByProtocol[protocol] = 0
	}
	for (const chain of chains) {
		dangerousPositionsAmountByChain[chain] = 0
	}
	for (const p of dangerousPositions) {
		dangerousPositionsAmount += p.collateralValue
		dangerousPositionsAmountByProtocol[p.protocol] =
			(dangerousPositionsAmountByProtocol[p.protocol] ?? 0) + p.collateralValue
		dangerousPositionsAmountByChain[p.chain] = (dangerousPositionsAmountByChain[p.chain] ?? 0) + p.collateralValue
	}

	const topPositions: PositionSmol[] = [...validPositions]
		.sort((a, b) => b.collateralValue - a.collateralValue)
		.slice(0, 100)
		.map((p) => ({
			liqPrice: p.liqPrice,
			collateralAmount: p.collateralAmount,
			collateralValue: p.collateralValue,
			protocol: p.protocol,
			chain: p.chain,
			url: p.url ?? '',
			displayName: p.displayName ?? undefined
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
				([keyA], [keyB]) => (liquidablesByChain[keyB] ?? 0) - (liquidablesByChain[keyA] ?? 0)
			),
			protocols: sortObject(
				chartDataBinsByProtocol,
				([keyA], [keyB]) => (liquidablesByProtocol[keyB] ?? 0) - (liquidablesByProtocol[keyA] ?? 0)
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

export async function getLatestLiquidationsChartData(symbol: string, totalBins = LIQUIDATIONS_TOTAL_BINS) {
	return await getPrevLiquidationsChartData(symbol, totalBins)
}
