import { keepNeededProperties } from '~/api/shared'
import { formatNum, formattedNum, getPercentChange, slug } from '~/utils'
import type { StablecoinChartPoint, StablecoinListAsset, StablecoinPricesResponse } from './api.types'

interface IStablecoinToken {
	symbol: string
	mcap: number
}

interface IStablecoinMcapPoint {
	date: string
	Mcap: number
	[key: string]: number | string
}

interface IStablecoinMcapStats {
	totalMcapCurrent: number | null
	totalMcapPrevDay: number | null
	totalMcapPrevWeek: number | null
	totalMcapPrevMonth: number | null
	change1d: string | null
	change7d: string | null
	change30d: string | null
	change1dUsd: number | null
	change7dUsd: number | null
	change30dUsd: number | null
	mcapChartData14d: Array<[number, number]> | null
}

interface IStablecoinAreaChartPoint {
	date: string
	[key: string]: number | string
}

interface IStablecoinStackedValue {
	circulating: number
	unreleased?: number
}

type IStablecoinStackedPoint = [string, Record<string, IStablecoinStackedValue>]

interface IStablecoinTokenInflowPoint {
	date: string
	[key: string]: number | string
}

interface IRateChartPoint {
	rates?: Record<string, string | number>
}

export interface IFormattedStablecoinChainRow {
	name: string
	circulating: number | null
	mcap: number | null
	unreleased: number | null
	bridgedTo: number | null
	minted: number | null
	mcapPrevDay: number | null
	mcapPrevWeek: number | null
	mcapPrevMonth: number | null
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	dominance: { name: string; value: string | number | null } | null
	mcaptvl: number | null
}

type StablecoinDominanceCandidate = {
	mcap?: number | null
}

type StablecoinFormattedAsset = Omit<
	StablecoinListAsset,
	'circulating' | 'circulatingPrevDay' | 'circulatingPrevWeek' | 'circulatingPrevMonth'
> & {
	circulating?: Record<string, number> | number | null
	circulatingPrevDay?: Record<string, number> | number | null
	circulatingPrevWeek?: Record<string, number> | number | null
	circulatingPrevMonth?: Record<string, number> | number | null
	unreleased?: number | null
	mcap?: number | null
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	change_1d_nol?: string | null
	change_7d_nol?: string | null
	change_1m_nol?: string | null
	pegDeviation?: number | null
	pegDeviation_1m?: number | null
	pegDeviationInfo?: {
		timestamp: number
		price: number
		priceSource: string | null
	}
}

const peggedAssetPickKeys = [
	'circulating',
	'unreleased',
	'mcap',
	'name',
	'symbol',
	'gecko_id',
	'chains',
	'price',
	'pegType',
	'pegMechanism',
	'change_1d',
	'change_7d',
	'change_1m',
	'change_1d_nol',
	'change_7d_nol',
	'change_1m_nol',
	'pegDeviation',
	'pegDeviation_1m',
	'pegDeviationInfo',
	'circulatingPrevDay',
	'circulatingPrevWeek',
	'circulatingPrevMonth',
	'delisted',
	'deprecated',
	'yieldBearing'
] as const

/**
 * The output type of `formatPeggedAssetsData`. `Pick<StablecoinFormattedAsset, …>` carries
 * union types (e.g. `circulating: Record | number`) that are already resolved to narrower
 * concrete types by the formatting logic, so we override those fields here.
 */
export type FormattedStablecoinAsset = Omit<
	Pick<StablecoinFormattedAsset, (typeof peggedAssetPickKeys)[number]>,
	'circulating' | 'circulatingPrevDay' | 'circulatingPrevWeek' | 'circulatingPrevMonth' | 'price'
> & {
	circulating?: number | null
	circulatingPrevDay?: number | null
	circulatingPrevWeek?: number | null
	circulatingPrevMonth?: number | null
	price?: number | null
}

/**
 * Base constraint for chart data points processed by `getPrevStablecoinTotalFromChart`
 * and `buildStablecoinChartData`. Requires a `date` field; other fields are accessed
 * via runtime string keys with `typeof` checks (using allowed `as Record<string, unknown>`
 * cast after `typeof === 'object'` validation).
 */
export type StablecoinChartDataPoint = { date: string | number }

interface IFormatPeggedAssetsDataParams {
	chain?: string
	peggedAssets?: StablecoinFormattedAsset[]
	chartDataByPeggedAsset?: Array<Array<StablecoinChartDataPoint> | null | undefined>
	priceData?: StablecoinPricesResponse
	rateData?: IRateChartPoint[]
	peggedNameToChartDataIndex?: Record<string, number>
}

interface IFormatPeggedChainsDataParams {
	chainList?: string[]
	peggedChartDataByChain?: Array<StablecoinChartPoint[] | null>
	chainDominances?: Record<string, { symbol: string; mcap: number }>
	chainsTVLData?: number[]
}

const toFiniteNumber = (value: unknown): number | null => {
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : null
}

interface IBuildStablecoinChartDataParams {
	chartDataByAssetOrChain: Array<Array<StablecoinChartDataPoint> | null | undefined>
	assetsOrChainsList: string[]
	filteredIndexes?: number[]
	issuanceType?: string
	selectedChain?: string | null
	totalChartTooltipLabel?: string
	doublecountedIds?: number[]
}

export interface IBuildStablecoinChartDataResult {
	peggedAreaChartData: IStablecoinAreaChartPoint[]
	peggedAreaTotalData: IStablecoinMcapPoint[]
	stackedDataset: IStablecoinStackedPoint[]
	tokenInflows: IStablecoinTokenInflowPoint[]
	tokenInflowNames: string[]
	usdInflows: Array<[string, number]>
}

export function getPrevStablecoinTotalFromChart(
	chart: Array<StablecoinChartDataPoint> | null | undefined,
	daysBefore: number,
	issuanceType: string,
	pegType: 'bridges'
): unknown
export function getPrevStablecoinTotalFromChart(
	chart: Array<StablecoinChartDataPoint> | null | undefined,
	daysBefore: number,
	issuanceType: string,
	pegType?: string
): number | null
export function getPrevStablecoinTotalFromChart(
	chart: Array<StablecoinChartDataPoint> | null | undefined,
	daysBefore: number,
	issuanceType: string,
	pegType = ''
) {
	if (!chart) return null
	const prevChart = chart[chart.length - 1 - daysBefore]
	if (!prevChart || typeof prevChart !== 'object') return null

	// Dynamic key access — the issuanceType varies at runtime ('mcap', 'circulating', 'totalCirculatingUSD', etc.)
	// so we use the allowed `as Record<string, unknown>` cast after the `typeof === 'object'` check above.
	const chartRecord = prevChart as Record<string, unknown>
	const issuanceTotals = chartRecord[issuanceType]
	if (!pegType) {
		if (typeof issuanceTotals === 'number') {
			return Number.isFinite(issuanceTotals) ? issuanceTotals : null
		}
		if (typeof issuanceTotals === 'string') {
			const numeric = Number(issuanceTotals)
			return Number.isFinite(numeric) ? numeric : null
		}
		if (!issuanceTotals || typeof issuanceTotals !== 'object') return null
		const totalsRecord = issuanceTotals as Record<string, unknown>
		let total = 0
		for (const value of Object.values(totalsRecord)) {
			const numeric = typeof value === 'number' ? value : Number(value)
			if (Number.isFinite(numeric)) total += numeric
		}
		return total
	}

	if (!issuanceTotals || typeof issuanceTotals !== 'object') return null
	const totalsRecord = issuanceTotals as Record<string, unknown>
	const target = totalsRecord[pegType]
	if (pegType === 'bridges') return target
	const numeric = typeof target === 'number' ? target : Number(target)
	return Number.isFinite(numeric) ? numeric : null
}

export const getStablecoinDominance = (
	topToken: StablecoinDominanceCandidate | null | undefined,
	totalMcap: number | null | undefined
): string | number | null => {
	const topMcap = topToken?.mcap
	if (!Number.isFinite(topMcap) || !Number.isFinite(totalMcap) || !topMcap || !totalMcap || totalMcap <= 0) {
		return null
	}
	const dominance = (topMcap / totalMcap) * 100.0
	if (!Number.isFinite(dominance) || dominance <= 0) return null
	if (dominance < 100) return dominance.toFixed(2)
	return 100
}

const DEFAULT_TOP_TOKEN: IStablecoinToken = { symbol: 'USDT', mcap: 0 }

export const getStablecoinTopTokenFromChartData = (
	rows: ReadonlyArray<IStablecoinAreaChartPoint> | null | undefined
): IStablecoinToken => {
	const latestRow = rows?.[rows.length - 1]
	if (!latestRow) return DEFAULT_TOP_TOKEN

	let topSymbol = DEFAULT_TOP_TOKEN.symbol
	let topMcap = DEFAULT_TOP_TOKEN.mcap

	for (const [key, rawValue] of Object.entries(latestRow)) {
		if (key === 'date') continue
		const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
		if (!Number.isFinite(value) || value <= topMcap) continue
		topMcap = value
		topSymbol = key
	}

	return { symbol: topSymbol, mcap: topMcap }
}

export const getStablecoinMcapStatsFromTotals = (
	peggedAreaTotalData: ReadonlyArray<IStablecoinMcapPoint> | null | undefined
): IStablecoinMcapStats => {
	const totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap ?? null
	const totalMcapPrevDay = peggedAreaTotalData?.[peggedAreaTotalData.length - 2]?.Mcap ?? null
	const totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap ?? null
	const totalMcapPrevMonth = peggedAreaTotalData?.[peggedAreaTotalData.length - 31]?.Mcap ?? null

	return {
		totalMcapCurrent,
		totalMcapPrevDay,
		totalMcapPrevWeek,
		totalMcapPrevMonth,
		change1d: getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? null,
		change7d: getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? null,
		change30d: getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? null,
		change1dUsd: totalMcapCurrent != null && totalMcapPrevDay != null ? totalMcapCurrent - totalMcapPrevDay : null,
		change7dUsd: totalMcapCurrent != null && totalMcapPrevWeek != null ? totalMcapCurrent - totalMcapPrevWeek : null,
		change30dUsd: totalMcapCurrent != null && totalMcapPrevMonth != null ? totalMcapCurrent - totalMcapPrevMonth : null,
		mcapChartData14d:
			peggedAreaTotalData && peggedAreaTotalData.length >= 14
				? peggedAreaTotalData.slice(-14).map((p) => [+p.date * 1000, p.Mcap ?? 0] as [number, number])
				: null
	}
}

const BACKFILLED_CHAINS = new Set([
	'All',
	'Ethereum',
	'BSC',
	'Avalanche',
	'Arbitrum',
	'Optimism',
	'Fantom',
	'Polygon',
	'Gnosis',
	'Celo',
	'Harmony',
	'Moonriver',
	'Aztec',
	'Loopring',
	'Starknet',
	'ZKsync',
	'Boba',
	'Metis',
	'Moonbeam',
	'Syscoin',
	'OKExChain',
	'IoTeX',
	'Heco'
])

export const buildStablecoinChartData = ({
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes,
	issuanceType = 'mcap',
	selectedChain,
	totalChartTooltipLabel = 'Mcap',
	doublecountedIds = []
}: IBuildStablecoinChartDataParams): IBuildStablecoinChartDataResult => {
	if (selectedChain === null) {
		return {
			peggedAreaChartData: [],
			peggedAreaTotalData: [],
			stackedDataset: [],
			tokenInflows: [],
			tokenInflowNames: [],
			usdInflows: []
		}
	}
	const totalCount = chartDataByAssetOrChain?.length ?? 0
	const filteredIndexesSet = new Set(filteredIndexes ?? Array.from({ length: totalCount }, (_, i) => i))
	const doublecountedIdsSet = new Set(doublecountedIds)

	const unformattedAreaData: Record<string, Record<string, number>> = {}
	const unformattedTotalData: Record<string, number> = {}
	const stackedDatasetObject: Record<string, Record<string, IStablecoinStackedValue>> = {}
	const unformattedTokenInflowData: Record<string, Record<string, number>> = {}
	const assetAddedToInflows: Record<string, boolean> = assetsOrChainsList.reduce(
		(acc, curr) => ({ ...acc, [curr]: false }),
		{}
	)

	if (chartDataByAssetOrChain) {
		for (let i = 0; i < chartDataByAssetOrChain.length; i++) {
			const charts = chartDataByAssetOrChain[i]
			if (!charts || !charts.length || !filteredIndexesSet.has(i) || doublecountedIdsSet.has(i)) continue
			for (let j = 0; j < charts.length; j++) {
				const chart = charts[j]
				const mcap = getPrevStablecoinTotalFromChart([chart], 0, issuanceType) // 'issuanceType' and 'mcap' here are 'circulating' values on /stablecoin pages, and 'mcap' otherwise
				const prevDayMcap = getPrevStablecoinTotalFromChart([charts[j - 1]], 0, issuanceType)
				const assetOrChain = assetsOrChainsList[i]
				const date = String(chart.date)
				const dateNumber = Number(date)
				const hasMcapValue = typeof mcap === 'number' && Number.isFinite(mcap)
				if (hasMcapValue) {
					if ((selectedChain && BACKFILLED_CHAINS.has(selectedChain)) || dateNumber > 1652241600) {
						// for individual chains data is currently only backfilled to May 11, 2022
						unformattedAreaData[date] = unformattedAreaData[date] || {}
						unformattedAreaData[date][assetsOrChainsList[i]] = mcap

						unformattedTotalData[date] = (unformattedTotalData[date] ?? 0) + mcap

						if (stackedDatasetObject[date] == undefined) {
							stackedDatasetObject[date] = {}
						}
						const unreleasedValue =
							issuanceType === 'circulating'
								? (getPrevStablecoinTotalFromChart([chart], 0, 'unreleased') ?? undefined)
								: undefined
						const b = stackedDatasetObject[date][assetOrChain]
						const hasFiniteUnreleased = typeof unreleasedValue === 'number' && Number.isFinite(unreleasedValue)
						stackedDatasetObject[date][assetOrChain] = {
							...b,
							circulating: mcap,
							...(hasFiniteUnreleased ? { unreleased: unreleasedValue } : {})
						}

						const diff = mcap - (prevDayMcap ?? 0)
						// the first day's inflow is not added to prevent large inflows on the day token is first tracked
						if (assetAddedToInflows[assetOrChain]) {
							unformattedTokenInflowData[date] = unformattedTokenInflowData[date] || {}
							unformattedTokenInflowData[date][assetsOrChainsList[i]] = diff
						}
						if (diff) {
							assetAddedToInflows[assetOrChain] = true
						}
					}
				}
			}
		}
	}

	const peggedAreaChartData: IStablecoinAreaChartPoint[] = Object.entries(unformattedAreaData)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([date, chart]) => {
			return {
				date,
				...chart
			}
		})

	const peggedAreaTotalData: IStablecoinMcapPoint[] = Object.entries(unformattedTotalData)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([date, mcap]) => {
			const normalizedMcap = Number.isFinite(mcap) ? mcap : 0
			return {
				date,
				Mcap: normalizedMcap,
				[totalChartTooltipLabel]: normalizedMcap
			}
		})

	const stackedDataset: IStablecoinStackedPoint[] = Object.entries(stackedDatasetObject).sort(
		([a], [b]) => Number(a) - Number(b)
	)

	const secondsInDay = 3600 * 24
	let zeroTokenInflows = 0
	let zeroUsdInflows = 0
	let tokenInflows: IStablecoinTokenInflowPoint[] = []
	let usdInflows: Array<[string, number]> = []
	const tokenSet: Set<string> = new Set()
	for (const date in unformattedTokenInflowData) {
		const chart = unformattedTokenInflowData[date]
		if (typeof chart === 'object') {
			let dayDifference = 0
			const tokenDayDifference: Record<string, number> = {}
			for (const token in chart) {
				tokenSet.add(token)
				const diff = chart[token]
				if (!Number.isNaN(diff)) {
					// Here, the inflow tokens could be restricted to top daily top tokens, but they aren't. Couldn't find good UX doing so.
					tokenDayDifference[token] = diff
					dayDifference += diff
				}
			}

			if (dayDifference === 0) {
				zeroUsdInflows++
			}

			if (Object.keys(tokenDayDifference).length === 0) {
				zeroTokenInflows++
			}

			// the dates on the inflows are all off by 1 (because timestamps are at 00:00), so they are moved back 1 day
			const adjustedDate = (parseInt(date) - secondsInDay).toString()

			tokenInflows.push({
				...tokenDayDifference,
				date: adjustedDate
			})

			usdInflows.push([adjustedDate, dayDifference])
		}
	}

	const tokenInflowNames = zeroTokenInflows === tokenInflows.length ? ['USDT'] : Array.from(tokenSet)

	tokenInflows = zeroTokenInflows === tokenInflows.length ? [{ USDT: 0, date: '1652486400' }] : tokenInflows
	usdInflows = zeroUsdInflows === usdInflows.length ? [['1652486400', 0]] : usdInflows

	// These series are built from object keys; keep them chronological for charts and "latest" lookups.
	tokenInflows.sort((a, b) => Number(a.date) - Number(b.date))
	usdInflows.sort((a, b) => Number(a[0]) - Number(b[0]))

	return { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows }
}

const getTargetPrice = (pegType: string, ratesChart: IRateChartPoint[], daysBefore: number): number | null => {
	const currencyTicker = pegType.slice(-3)
	if (currencyTicker === 'USD') {
		return 1
	}
	const rates = ratesChart?.[ratesChart.length - 1 - daysBefore] ?? null
	const rate = rates?.rates?.[currencyTicker]
	const numericRate = typeof rate === 'number' ? rate : Number(rate)
	if (!Number.isFinite(numericRate) || numericRate === 0) return null
	return 1 / numericRate
}

export const formatPeggedAssetsData = ({
	chain = '',
	peggedAssets = [],
	chartDataByPeggedAsset = [],
	priceData = [],
	rateData = [],
	peggedNameToChartDataIndex = {}
}: IFormatPeggedAssetsDataParams): FormattedStablecoinAsset[] => {
	let inputAssets = [...peggedAssets]

	if (chain) {
		const sluggedChain = slug(chain)
		inputAssets = inputAssets.filter(({ chains = [] }) => chains.some((c) => slug(c) === sluggedChain))
	}

	const mappedAssets: FormattedStablecoinAsset[] = inputAssets.map((pegged) => {
		const formattedPegged: StablecoinFormattedAsset = { ...pegged }
		const pegType = formattedPegged.pegType ?? ''
		const peggedGeckoID = formattedPegged.gecko_id
		const rawPrice = formattedPegged.price
		const price = typeof rawPrice === 'number' ? rawPrice : rawPrice != null ? Number(rawPrice) : null
		const priceSource = formattedPegged.priceSource ?? null
		if (chain) {
			const chainCirculating = formattedPegged.chainCirculating?.[chain]
			formattedPegged.circulating = chainCirculating ? (chainCirculating.current?.[pegType] ?? 0) : 0
			formattedPegged.circulatingPrevDay = chainCirculating
				? (chainCirculating.circulatingPrevDay?.[pegType] ?? null)
				: null
			formattedPegged.circulatingPrevWeek = chainCirculating
				? (chainCirculating.circulatingPrevWeek?.[pegType] ?? null)
				: null
			formattedPegged.circulatingPrevMonth = chainCirculating
				? (chainCirculating.circulatingPrevMonth?.[pegType] ?? null)
				: null
		} else {
			const circulatingRaw = formattedPegged.circulating
			const circulatingMap = typeof circulatingRaw === 'object' && circulatingRaw != null ? circulatingRaw : null
			const circulatingPrevDayRaw = formattedPegged.circulatingPrevDay
			const circulatingPrevDayMap =
				typeof circulatingPrevDayRaw === 'object' && circulatingPrevDayRaw != null ? circulatingPrevDayRaw : null
			const circulatingPrevWeekRaw = formattedPegged.circulatingPrevWeek
			const circulatingPrevWeekMap =
				typeof circulatingPrevWeekRaw === 'object' && circulatingPrevWeekRaw != null ? circulatingPrevWeekRaw : null
			const circulatingPrevMonthRaw = formattedPegged.circulatingPrevMonth
			const circulatingPrevMonthMap =
				typeof circulatingPrevMonthRaw === 'object' && circulatingPrevMonthRaw != null ? circulatingPrevMonthRaw : null
			formattedPegged.circulating = circulatingMap?.[pegType] ?? 0
			formattedPegged.circulatingPrevDay = circulatingPrevDayMap?.[pegType] ?? null
			formattedPegged.circulatingPrevWeek = circulatingPrevWeekMap?.[pegType] ?? null
			formattedPegged.circulatingPrevMonth = circulatingPrevMonthMap?.[pegType] ?? null
		}
		const chartIndex = peggedNameToChartDataIndex[formattedPegged.name]
		const chart = chartDataByPeggedAsset[chartIndex] ?? null

		formattedPegged.mcap = getPrevStablecoinTotalFromChart(chart, 0, 'mcap') ?? null
		const mcapPrevDay = getPrevStablecoinTotalFromChart(chart, 1, 'mcap') ?? null
		const mcapPrevWeek = getPrevStablecoinTotalFromChart(chart, 7, 'mcap') ?? null
		const mcapPrevMonth = getPrevStablecoinTotalFromChart(chart, 30, 'mcap') ?? null
		formattedPegged.change_1d = getPercentChange(formattedPegged.mcap, mcapPrevDay)
		formattedPegged.change_7d = getPercentChange(formattedPegged.mcap, mcapPrevWeek)
		formattedPegged.change_1m = getPercentChange(formattedPegged.mcap, mcapPrevMonth)

		const change_1d_nol =
			formattedPegged.mcap && mcapPrevDay
				? formattedNum(String(Number(formattedPegged.mcap) - Number(mcapPrevDay)), true)
				: null
		const change_7d_nol =
			formattedPegged.mcap && mcapPrevWeek
				? formattedNum(String(Number(formattedPegged.mcap) - Number(mcapPrevWeek)), true)
				: null
		const change_1m_nol =
			formattedPegged.mcap && mcapPrevMonth
				? formattedNum(String(Number(formattedPegged.mcap) - Number(mcapPrevMonth)), true)
				: null

		formattedPegged.change_1d_nol = !change_1d_nol
			? null
			: change_1d_nol.startsWith('-')
				? change_1d_nol
				: `+${change_1d_nol}`
		formattedPegged.change_7d_nol = !change_7d_nol
			? null
			: change_7d_nol.startsWith('-')
				? change_7d_nol
				: `+${change_7d_nol}`
		formattedPegged.change_1m_nol = !change_1m_nol
			? null
			: change_1m_nol.startsWith('-')
				? change_1m_nol
				: `+${change_1m_nol}`

		if (pegType !== 'peggedVAR' && price) {
			const targetPrice = getTargetPrice(pegType, rateData, 0)
			formattedPegged.pegDeviation = getPercentChange(price, targetPrice)
			let greatestDeviation = 0
			for (let i = 0; i < 30; i++) {
				const historicalPrices = priceData[priceData.length - i - 1]
				const historicalTargetPrice = getTargetPrice(pegType, rateData, i)
				const historicalPrice = peggedGeckoID != null ? toFiniteNumber(historicalPrices?.prices?.[peggedGeckoID]) : null
				if (historicalPrice && historicalTargetPrice) {
					const timestamp = historicalPrices?.date
					const deviation = historicalPrice - historicalTargetPrice
					if (Math.abs(greatestDeviation) < Math.abs(deviation)) {
						greatestDeviation = deviation
						if (0.02 < Math.abs(greatestDeviation)) {
							formattedPegged.pegDeviationInfo = {
								timestamp: timestamp,
								price: historicalPrice,
								priceSource: priceSource
							}
						}
					}
				}
			}
			if (targetPrice != null && Math.abs(greatestDeviation) < Math.abs(price - targetPrice)) {
				greatestDeviation = price - targetPrice
				if (0.02 < Math.abs(greatestDeviation)) {
					formattedPegged.pegDeviationInfo = {
						timestamp: Date.now() / 1000,
						price: price,
						priceSource: priceSource
					}
				}
			}
			formattedPegged.pegDeviation_1m =
				targetPrice != null ? getPercentChange(targetPrice + greatestDeviation, targetPrice) : null
		} else {
			// Avoid leaking stale peg data into filters/table (e.g. when price is missing or peg is variable).
			formattedPegged.pegDeviation = undefined
			formattedPegged.pegDeviation_1m = undefined
			formattedPegged.pegDeviationInfo = undefined
		}
		// Narrow `price` from `string | number | null` to `number | null` (resolved above).
		formattedPegged.price = price
		const picked = keepNeededProperties(formattedPegged, peggedAssetPickKeys)
		// After formatting, circulating/circulatingPrev* are always `number | null`
		// and price is `number | null`. The Pick type is wider because
		// StablecoinFormattedAsset carries the pre-formatting union types.
		// Runtime values are already narrowed; annotate the return.
		return picked as FormattedStablecoinAsset
	})

	if (chain) {
		return [...mappedAssets].sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0))
	}

	return mappedAssets
}

export const formatPeggedChainsData = ({
	chainList = [],
	peggedChartDataByChain = [],
	chainDominances = {},
	chainsTVLData = []
}: IFormatPeggedChainsDataParams): IFormattedStablecoinChainRow[] => {
	let formattedStablecoinChains: IFormattedStablecoinChainRow[] = peggedChartDataByChain.map((chart, i) => {
		const chainName = chainList[i]
		const chainDominance = chainDominances[chainName] ?? null

		const latestChainTVL = chainsTVLData?.[i] ?? null

		const mcap = getPrevStablecoinTotalFromChart(chart, 0, 'totalCirculatingUSD')
		const mcapPrevDay = getPrevStablecoinTotalFromChart(chart, 1, 'totalCirculatingUSD')
		const mcapPrevWeek = getPrevStablecoinTotalFromChart(chart, 7, 'totalCirculatingUSD')
		const mcapPrevMonth = getPrevStablecoinTotalFromChart(chart, 30, 'totalCirculatingUSD')
		const circulating = getPrevStablecoinTotalFromChart(chart, 0, 'totalCirculating')
		const unreleased = getPrevStablecoinTotalFromChart(chart, 0, 'totalUnreleased')
		const bridgedTo = getPrevStablecoinTotalFromChart(chart, 0, 'totalBridgedToUSD')
		const minted = getPrevStablecoinTotalFromChart(chart, 0, 'totalMintedUSD')
		const dominance = chainDominance
			? {
					name: chainDominance.symbol,
					value: getStablecoinDominance(chainDominance, mcap)
				}
			: null

		let mcaptvl = mcap && latestChainTVL ? +(formatNum(mcap / latestChainTVL) ?? 0) : null
		if (mcaptvl == 0) {
			mcaptvl = null
		}

		return {
			name: chainName,
			circulating,
			mcap,
			unreleased,
			bridgedTo,
			minted,
			mcapPrevDay,
			mcapPrevWeek,
			mcapPrevMonth,
			change_1d: getPercentChange(mcap, mcapPrevDay),
			change_7d: getPercentChange(mcap, mcapPrevWeek),
			change_1m: getPercentChange(mcap, mcapPrevMonth),
			dominance,
			mcaptvl
		}
	})

	formattedStablecoinChains = [...formattedStablecoinChains].sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0))

	return formattedStablecoinChains
}
