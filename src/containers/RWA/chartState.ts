import type { ParsedUrlQuery } from 'querystring'
import { readSingleQueryValue } from '~/utils/routerQuery'
import type { RWAOverviewMode } from './constants'

export type RWAChartMetric = 'activeMcap' | 'onChainMcap' | 'defiActiveTvl'
export type RWAChartView = 'timeSeries' | 'pie' | 'treemap' | 'hbar'
export type RWAChartBreakdown = 'chain' | 'category' | 'assetClass' | 'assetName' | 'platform' | 'assetGroup'
export type RwaTreemapParentGrouping = RWAChartBreakdown
export type RwaTreemapNestedBy = 'none' | 'assetClass' | 'assetName' | 'category'
export type RWAChartOption<T extends string> = { key: T; name: string }
export type RWAChartModeState =
	| { mode: 'chain'; canBreakdownByChain: boolean }
	| { mode: 'category'; canBreakdownByChain: boolean }
	| { mode: 'platform'; canBreakdownByChain: boolean }
	| { mode: 'assetGroup'; canBreakdownByChain: boolean }

export type RWAChartState = {
	mode: RWAChartModeState
	view: RWAChartView
	metric: RWAChartMetric
	breakdown: RWAChartBreakdown
	treemapNestedBy: RwaTreemapNestedBy
}

const CHART_VIEW_OPTIONS: ReadonlyArray<RWAChartOption<RWAChartView>> = [
	{ key: 'timeSeries', name: 'Time Series Chart' },
	{ key: 'pie', name: 'Pie Chart' },
	{ key: 'treemap', name: 'Treemap Chart' },
	{ key: 'hbar', name: 'HBar Chart' }
]

const CHART_METRIC_OPTIONS: ReadonlyArray<{ key: RWAChartMetric; label: string }> = [
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const BREAKDOWN_LABELS: Record<RWAChartBreakdown, string> = {
	chain: 'Chain',
	category: 'Asset Category',
	assetClass: 'Asset Class',
	assetName: 'Asset Name',
	platform: 'Asset Platform',
	assetGroup: 'Asset Group'
}

const TREEMAP_NESTED_BY_LABELS: Record<RwaTreemapNestedBy, string> = {
	none: 'No Grouping',
	assetClass: 'Asset Class',
	assetName: 'Asset Name',
	category: 'Asset Category'
}

const TIME_SERIES_BREAKDOWNS: Record<RWAOverviewMode, readonly RWAChartBreakdown[]> = {
	chain: ['assetGroup', 'category', 'assetClass', 'platform'],
	category: ['assetGroup', 'assetClass', 'platform'],
	platform: ['assetGroup', 'assetName', 'category', 'assetClass'],
	assetGroup: ['assetName', 'assetClass', 'platform', 'category']
}

const NON_TIME_SERIES_BREAKDOWNS: Record<
	RWAOverviewMode,
	{ withChain: readonly RWAChartBreakdown[]; withoutChain: readonly RWAChartBreakdown[] }
> = {
	chain: {
		withChain: ['assetGroup', 'category', 'assetClass', 'platform', 'chain'],
		withoutChain: ['assetGroup', 'category', 'assetClass', 'platform']
	},
	category: {
		withChain: ['assetGroup', 'assetClass', 'platform', 'chain'],
		withoutChain: ['assetGroup', 'assetClass', 'platform']
	},
	platform: {
		withChain: ['assetGroup', 'assetName', 'category', 'assetClass', 'chain'],
		withoutChain: ['assetGroup', 'assetName', 'category', 'assetClass']
	},
	assetGroup: {
		withChain: ['assetName', 'assetClass', 'platform', 'category', 'chain'],
		withoutChain: ['assetName', 'assetClass', 'platform', 'category']
	}
}

const NON_TIME_SERIES_DEFAULTS: Record<RWAOverviewMode, RWAChartBreakdown> = {
	chain: 'assetGroup',
	category: 'assetGroup',
	platform: 'assetGroup',
	assetGroup: 'assetName'
}

const TREEMAP_NESTED_BY_OPTIONS: Record<RwaTreemapParentGrouping, readonly RwaTreemapNestedBy[]> = {
	chain: ['none', 'assetName'],
	category: ['none', 'assetClass', 'assetName'],
	assetClass: ['none', 'assetName'],
	assetName: ['none'],
	platform: ['none', 'assetName'],
	assetGroup: ['none', 'assetClass', 'assetName', 'category']
}

const TREEMAP_DEFAULT_NESTED_BY: Record<RwaTreemapParentGrouping, RwaTreemapNestedBy> = {
	chain: 'none',
	category: 'assetClass',
	assetClass: 'none',
	assetName: 'none',
	platform: 'none',
	assetGroup: 'none'
}

const DEFAULT_CHART_VIEW: RWAChartView = 'timeSeries'
const DEFAULT_CHART_METRIC: RWAChartMetric = 'activeMcap'
const VALID_CHART_VIEWS = new Set<RWAChartView>(CHART_VIEW_OPTIONS.map(({ key }) => key))
const VALID_CHART_METRICS = new Set<RWAChartMetric>(CHART_METRIC_OPTIONS.map(({ key }) => key))

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

export function createRwaChartModeState(mode: RWAOverviewMode, canBreakdownByChain: boolean): RWAChartModeState {
	switch (mode) {
		case 'chain':
			return { mode, canBreakdownByChain }
		case 'category':
			return { mode, canBreakdownByChain }
		case 'platform':
			return { mode, canBreakdownByChain }
		case 'assetGroup':
			return { mode, canBreakdownByChain }
		default:
			return assertNever(mode)
	}
}

export function getChartViewOptions(): readonly RWAChartOption<RWAChartView>[] {
	return CHART_VIEW_OPTIONS
}

export function getChartMetricOptions(): ReadonlyArray<{ key: RWAChartMetric; label: string }> {
	return CHART_METRIC_OPTIONS
}

export function getChartMetricLabel(metric: RWAChartMetric): string {
	const option = CHART_METRIC_OPTIONS.find(({ key }) => key === metric)
	assert(option, `Missing chart metric label for ${metric}`)
	return option.label
}

export function getBreakdownLabel(breakdown: RWAChartBreakdown): string {
	return BREAKDOWN_LABELS[breakdown]
}

export function getTreemapNestedByLabel(nestedBy: RwaTreemapNestedBy): string {
	return TREEMAP_NESTED_BY_LABELS[nestedBy]
}

export function getDefaultChartBreakdown(mode: RWAChartModeState, view: RWAChartView): RWAChartBreakdown {
	if (view === 'timeSeries') return TIME_SERIES_BREAKDOWNS[mode.mode][0]
	return NON_TIME_SERIES_DEFAULTS[mode.mode]
}

export function getChartBreakdownOptions(
	state: Pick<RWAChartState, 'mode' | 'view'>
): RWAChartOption<RWAChartBreakdown>[] {
	return getAllowedBreakdowns(state.mode, state.view).map((key) => ({
		key,
		name: BREAKDOWN_LABELS[key]
	}))
}

export function getTreemapParentGrouping(breakdown: RWAChartBreakdown): RwaTreemapParentGrouping {
	return breakdown
}

export function getTreemapNestedByOptions(
	parentGrouping: RwaTreemapParentGrouping
): RWAChartOption<RwaTreemapNestedBy>[] {
	return TREEMAP_NESTED_BY_OPTIONS[parentGrouping].map((key) => ({
		key,
		name: TREEMAP_NESTED_BY_LABELS[key]
	}))
}

export function parseRwaChartState(query: ParsedUrlQuery, mode: RWAChartModeState): RWAChartState {
	const view = normalizeChartView(readSingleQueryValue(query.chartView))
	const metric = normalizeChartMetric(readSingleQueryValue(query.chartType))
	const breakdownQueryKey = getBreakdownQueryKey(view)
	const breakdown = normalizeBreakdown(mode, view, readSingleQueryValue(query[breakdownQueryKey]))
	const treemapNestedBy = normalizeTreemapNestedBy(
		getTreemapParentGrouping(breakdown),
		readSingleQueryValue(query.treemapNestedBy)
	)

	return { mode, view, metric, breakdown, treemapNestedBy }
}

export function setChartView(state: RWAChartState, view: RWAChartView): RWAChartState {
	const breakdown = normalizeBreakdown(state.mode, view, state.breakdown)
	const treemapNestedBy = normalizeTreemapNestedBy(getTreemapParentGrouping(breakdown), state.treemapNestedBy)
	return { ...state, view, breakdown, treemapNestedBy }
}

export function setChartBreakdown(state: RWAChartState, breakdown: RWAChartBreakdown): RWAChartState {
	const allowedBreakdowns = getAllowedBreakdowns(state.mode, state.view)
	assert(
		allowedBreakdowns.includes(breakdown),
		`Invalid chart breakdown ${breakdown} for ${state.mode.mode}/${state.view}`
	)
	const treemapNestedBy = normalizeTreemapNestedBy(getTreemapParentGrouping(breakdown), state.treemapNestedBy)
	return { ...state, breakdown, treemapNestedBy }
}

export function setTreemapNestedBy(state: RWAChartState, nestedBy: RwaTreemapNestedBy): RWAChartState {
	const parentGrouping = getTreemapParentGrouping(state.breakdown)
	const allowedNestedBy = TREEMAP_NESTED_BY_OPTIONS[parentGrouping]
	assert(allowedNestedBy.includes(nestedBy), `Invalid treemap nested-by ${nestedBy} for ${parentGrouping}`)
	return { ...state, treemapNestedBy: nestedBy }
}

export function getChartViewQueryValue(view: RWAChartView): string | undefined {
	return view === DEFAULT_CHART_VIEW ? undefined : view
}

export function getChartMetricQueryValue(metric: RWAChartMetric): string | undefined {
	return metric === DEFAULT_CHART_METRIC ? undefined : metric
}

export function getChartBreakdownQueryValue(state: RWAChartState): string | undefined {
	const defaultBreakdown = getDefaultChartBreakdown(state.mode, state.view)
	if (state.breakdown === defaultBreakdown) return undefined
	return state.breakdown
}

export function getTreemapNestedByQueryValue(state: RWAChartState): string | undefined {
	const defaultNestedBy = TREEMAP_DEFAULT_NESTED_BY[getTreemapParentGrouping(state.breakdown)]
	if (state.treemapNestedBy === defaultNestedBy) return undefined
	return state.treemapNestedBy
}

function getAllowedBreakdowns(mode: RWAChartModeState, view: RWAChartView): readonly RWAChartBreakdown[] {
	if (view === 'timeSeries') return TIME_SERIES_BREAKDOWNS[mode.mode]
	const options = NON_TIME_SERIES_BREAKDOWNS[mode.mode]
	return mode.canBreakdownByChain ? options.withChain : options.withoutChain
}

function getBreakdownQueryKey(view: RWAChartView): 'timeSeriesChartBreakdown' | 'nonTimeSeriesChartBreakdown' {
	return view === 'timeSeries' ? 'timeSeriesChartBreakdown' : 'nonTimeSeriesChartBreakdown'
}

function normalizeChartView(value: string | undefined): RWAChartView {
	if (value === 'bar') return 'hbar'
	if (value && VALID_CHART_VIEWS.has(value as RWAChartView)) return value as RWAChartView
	return DEFAULT_CHART_VIEW
}

function normalizeChartMetric(value: string | undefined): RWAChartMetric {
	if (value && VALID_CHART_METRICS.has(value as RWAChartMetric)) return value as RWAChartMetric
	return DEFAULT_CHART_METRIC
}

function normalizeBreakdown(mode: RWAChartModeState, view: RWAChartView, value: string | undefined): RWAChartBreakdown {
	const allowedBreakdowns = getAllowedBreakdowns(mode, view)
	if (value && allowedBreakdowns.includes(value as RWAChartBreakdown)) return value as RWAChartBreakdown
	return getDefaultChartBreakdown(mode, view)
}

function normalizeTreemapNestedBy(
	parentGrouping: RwaTreemapParentGrouping,
	value: string | undefined
): RwaTreemapNestedBy {
	const allowedNestedBy = TREEMAP_NESTED_BY_OPTIONS[parentGrouping]
	if (value && allowedNestedBy.includes(value as RwaTreemapNestedBy)) return value as RwaTreemapNestedBy
	return TREEMAP_DEFAULT_NESTED_BY[parentGrouping]
}
