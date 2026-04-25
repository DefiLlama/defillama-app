import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { CHART_COLORS } from '~/constants/colors'
import { getDominancePercent } from '~/utils'
import type { IBuildStablecoinChartDataResult, IBuildStablecoinChartDataParams } from './utils'
import {
	buildStablecoinAreaChartData,
	buildStablecoinInflowsChartData,
	buildStablecoinTotalChartData,
	getStablecoinMcapStatsFromTotals,
	getStablecoinTopTokenFromChartData,
	getStablecoinValueFromPoint,
	getStablecoinDominance
} from './utils'

export const STABLECOIN_CHART_STALE_TIME = 5 * 60 * 1000
export const STABLECOIN_CHART_CACHE_CONTROL = 'public, max-age=300'

export type StablecoinOverviewChartType = 'totalMcap' | 'tokenMcaps' | 'dominance' | 'usdInflows' | 'tokenInflows'
export type StablecoinChainsChartType = 'totalMcap' | 'chainMcaps' | 'dominance'
export type StablecoinAssetChartType = 'totalCirc' | 'chainMcaps' | 'chainDominance'
export type StablecoinChartSeriesType =
	| StablecoinOverviewChartType
	| StablecoinChainsChartType
	| StablecoinAssetChartType

export type StablecoinChartSummary = {
	totalMcapCurrent: number | null
	change1d: string | null
	change7d: string | null
	change30d: string | null
	change1dUsd: number | null
	change7dUsd: number | null
	change30dUsd: number | null
	topToken: { symbol: string; mcap: number }
	dominance: string | number | null
}

export interface StablecoinChartSeriesPayload {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	valueSymbol?: string
	stacked?: boolean
	showTotalInTooltip?: boolean
	expandTo100Percent?: boolean
	summary?: StablecoinChartSummary
}

const TOKEN_COLORS: Record<string, string> = {
	USDT: '#009393',
	USDC: '#0B53BF',
	DAI: '#F4B731',
	USDe: '#3A3A3A',
	BUIDL: '#111111',
	USD1: '#D2B48C',
	USDS: '#E67E22',
	PYUSD: '#4A90E2',
	USDTB: '#C0C0C0',
	FDUSD: '#00FF00',
	Others: '#FF1493'
}

const TOTAL_MCAP_CHARTS: MultiSeriesChart2SeriesConfig[] = [
	{ type: 'line', name: 'Mcap', encode: { x: 'timestamp', y: 'Mcap' }, color: CHART_COLORS[0] }
]

const TOTAL_CIRC_CHARTS: MultiSeriesChart2SeriesConfig[] = [
	{ type: 'line', name: 'Circulating', encode: { x: 'timestamp', y: 'Circulating' }, color: CHART_COLORS[0] }
]

const USD_INFLOWS_CHARTS: MultiSeriesChart2SeriesConfig[] = [
	{ type: 'bar', name: 'Inflows', encode: { x: 'timestamp', y: 'Inflows' }, color: CHART_COLORS[0] }
]

const getSeriesNames = (
	assetsOrChainsList: string[],
	filteredIndexes?: number[],
	doublecountedIds?: number[]
): string[] => {
	const names: string[] = []
	const doublecountedSet = doublecountedIds?.length ? new Set(doublecountedIds) : null
	if (!filteredIndexes) {
		for (let i = 0; i < assetsOrChainsList.length; i++) {
			if (doublecountedSet?.has(i)) continue
			const name = assetsOrChainsList[i]
			if (name) names.push(name)
		}
		return names
	}
	for (const index of filteredIndexes) {
		if (doublecountedSet?.has(index)) continue
		const name = assetsOrChainsList[index]
		if (name) names.push(name)
	}
	return names
}

export const getTopStablecoinFromLatestPoints = ({
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes,
	issuanceType = 'mcap',
	doublecountedIds = []
}: Pick<
	IBuildStablecoinChartDataParams,
	'chartDataByAssetOrChain' | 'assetsOrChainsList' | 'filteredIndexes' | 'issuanceType' | 'doublecountedIds'
>): { symbol: string; mcap: number } => {
	const filteredIndexesSet = filteredIndexes ? new Set(filteredIndexes) : null
	const doublecountedSet = doublecountedIds.length ? new Set(doublecountedIds) : null
	let topSymbol = 'USDT'
	let topMcap = 0
	for (let i = 0; i < chartDataByAssetOrChain.length; i++) {
		if (filteredIndexesSet && !filteredIndexesSet.has(i)) continue
		if (doublecountedSet?.has(i)) continue
		const chart = chartDataByAssetOrChain[i]
		const latestPoint = chart?.[chart.length - 1]
		const mcap = getStablecoinValueFromPoint(latestPoint, issuanceType)
		if (typeof mcap !== 'number' || !Number.isFinite(mcap) || mcap <= topMcap) continue
		topMcap = mcap
		topSymbol = assetsOrChainsList[i] ?? topSymbol
	}
	return { symbol: topSymbol, mcap: topMcap }
}

export const buildStablecoinChartSummary = (
	peggedAreaTotalData: IBuildStablecoinChartDataResult['peggedAreaTotalData'],
	topToken: { symbol: string; mcap: number }
): StablecoinChartSummary => {
	const stats = getStablecoinMcapStatsFromTotals(peggedAreaTotalData)
	return {
		totalMcapCurrent: stats.totalMcapCurrent,
		change1d: stats.change1d,
		change7d: stats.change7d,
		change30d: stats.change30d,
		change1dUsd: stats.change1dUsd,
		change7dUsd: stats.change7dUsd,
		change30dUsd: stats.change30dUsd,
		topToken,
		dominance: getStablecoinDominance(topToken, stats.totalMcapCurrent)
	}
}

export const buildTotalMcapPayload = (
	params: IBuildStablecoinChartDataParams,
	options?: { totalName?: string; summaryTopToken?: { symbol: string; mcap: number }; includeUnreleased?: boolean }
): StablecoinChartSeriesPayload => {
	const totalName = options?.totalName ?? 'Mcap'
	if (options?.includeUnreleased) {
		const { stackedDataset } = buildStablecoinAreaChartData(params)
		const source: MultiSeriesChart2Dataset['source'] = []
		for (const [date, values] of stackedDataset) {
			const timestamp = Number(date) * 1e3
			if (!Number.isFinite(timestamp)) continue
			let total = 0
			for (const name in values) {
				const value = values[name]
				total += (value.circulating ?? 0) + (value.unreleased ?? 0)
			}
			source.push({ timestamp, [totalName]: total })
		}
		return {
			dataset: { source, dimensions: ['timestamp', totalName] },
			charts: totalName === 'Circulating' ? TOTAL_CIRC_CHARTS : TOTAL_MCAP_CHARTS,
			valueSymbol: totalName === 'Circulating' ? '' : '$',
			stacked: false,
			showTotalInTooltip: false
		}
	}

	const { peggedAreaTotalData } = buildStablecoinTotalChartData({
		...params,
		totalChartTooltipLabel: totalName
	})
	const source: MultiSeriesChart2Dataset['source'] = []
	for (const point of peggedAreaTotalData) {
		const timestamp = Number(point.date) * 1e3
		if (!Number.isFinite(timestamp)) continue
		const value = Number(point[totalName] ?? point.Mcap ?? 0)
		source.push({ timestamp, [totalName]: Number.isFinite(value) ? value : 0 })
	}

	const charts = totalName === 'Circulating' ? TOTAL_CIRC_CHARTS : TOTAL_MCAP_CHARTS
	const payload: StablecoinChartSeriesPayload = {
		dataset: { source, dimensions: ['timestamp', totalName] },
		charts,
		valueSymbol: totalName === 'Circulating' ? '' : '$',
		stacked: false,
		showTotalInTooltip: false
	}
	if (options?.summaryTopToken) {
		payload.summary = buildStablecoinChartSummary(peggedAreaTotalData, options.summaryTopToken)
	}
	return payload
}

export const buildAreaPayload = (
	params: IBuildStablecoinChartDataParams,
	options: {
		chartNames?: string[]
		stackName: string
		valueSymbol?: string
		summary?: boolean
	}
): StablecoinChartSeriesPayload => {
	const { peggedAreaChartData } = buildStablecoinAreaChartData(params)
	const chartNames =
		options.chartNames ?? getSeriesNames(params.assetsOrChainsList, params.filteredIndexes, params.doublecountedIds)
	const source: MultiSeriesChart2Dataset['source'] = []
	for (const point of peggedAreaChartData) {
		const timestamp = Number(point.date) * 1e3
		if (!Number.isFinite(timestamp)) continue
		const row: MultiSeriesChart2Dataset['source'][number] = { timestamp }
		for (const name of chartNames) {
			const value = point[name]
			if (typeof value === 'number' && Number.isFinite(value)) row[name] = value
		}
		source.push(row)
	}
	const charts = chartNames.map((name, i) => ({
		type: 'line' as const,
		name,
		encode: { x: 'timestamp', y: name },
		color: TOKEN_COLORS[name] ?? CHART_COLORS[i % CHART_COLORS.length],
		stack: options.stackName
	}))

	const payload: StablecoinChartSeriesPayload = {
		dataset: { source, dimensions: ['timestamp', ...chartNames] },
		charts,
		stacked: true,
		valueSymbol: options.valueSymbol ?? '$',
		showTotalInTooltip: true
	}

	if (options.summary) {
		const topToken = getStablecoinTopTokenFromChartData(peggedAreaChartData)
		const { peggedAreaTotalData } = buildStablecoinTotalChartData(params)
		payload.summary = buildStablecoinChartSummary(peggedAreaTotalData, topToken)
	}

	return payload
}

export const buildDominancePayload = (
	params: IBuildStablecoinChartDataParams,
	options?: { chartNames?: string[]; includeUnreleased?: boolean; stackName?: string }
): StablecoinChartSeriesPayload => {
	const { stackedDataset } = buildStablecoinAreaChartData(params)
	const chartNames =
		options?.chartNames ?? getSeriesNames(params.assetsOrChainsList, params.filteredIndexes, params.doublecountedIds)
	const source: MultiSeriesChart2Dataset['source'] = []

	for (const [date, values] of stackedDataset) {
		const timestamp = Number(date) * 1e3
		if (!Number.isFinite(timestamp)) continue
		const dayValues: Record<string, number> = {}
		let total = 0
		for (const name of chartNames) {
			const chainCirculating = values[name]
			let sum = chainCirculating?.circulating ?? 0
			if (options?.includeUnreleased && chainCirculating?.unreleased) sum += chainCirculating.unreleased
			dayValues[name] = sum
			total += sum
		}

		const row: MultiSeriesChart2Dataset['source'][number] = { timestamp }
		for (const name of chartNames) {
			row[name] = getDominancePercent(dayValues[name], total)
		}
		source.push(row)
	}

	return {
		dataset: { source, dimensions: ['timestamp', ...chartNames] },
		charts: chartNames.map((name, i) => ({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: TOKEN_COLORS[name] ?? CHART_COLORS[i % CHART_COLORS.length],
			stack: options?.stackName ?? 'dominance'
		})),
		stacked: true,
		expandTo100Percent: true,
		valueSymbol: '%',
		showTotalInTooltip: false
	}
}

export const buildUsdInflowsPayload = (params: IBuildStablecoinChartDataParams): StablecoinChartSeriesPayload => {
	const { usdInflows } = buildStablecoinInflowsChartData(params)
	const source: MultiSeriesChart2Dataset['source'] = []
	for (const [date, value] of usdInflows) {
		const timestamp = Number(date) * 1e3
		if (!Number.isFinite(timestamp)) continue
		source.push({ timestamp, Inflows: value })
	}
	return {
		dataset: { source, dimensions: ['timestamp', 'Inflows'] },
		charts: USD_INFLOWS_CHARTS,
		stacked: false,
		showTotalInTooltip: false
	}
}

export const buildTokenInflowsPayload = (params: IBuildStablecoinChartDataParams): StablecoinChartSeriesPayload => {
	const { tokenInflows, tokenInflowNames } = buildStablecoinInflowsChartData(params)
	const source: MultiSeriesChart2Dataset['source'] = []
	for (const point of tokenInflows) {
		const timestamp = Number(point.date) * 1e3
		if (!Number.isFinite(timestamp)) continue
		const row: MultiSeriesChart2Dataset['source'][number] = { timestamp }
		for (const name of tokenInflowNames) {
			const value = point[name]
			if (typeof value === 'number' && Number.isFinite(value)) row[name] = value
		}
		source.push(row)
	}
	return {
		dataset: { source, dimensions: ['timestamp', ...tokenInflowNames] },
		charts: tokenInflowNames.map((name, i) => ({
			type: 'bar',
			name,
			encode: { x: 'timestamp', y: name },
			color: TOKEN_COLORS[name] ?? CHART_COLORS[i % CHART_COLORS.length],
			stack: 'tokenInflows'
		})),
		stacked: true,
		showTotalInTooltip: true
	}
}
