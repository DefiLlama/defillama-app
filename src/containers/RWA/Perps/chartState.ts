import type { ParsedUrlQuery } from 'querystring'
import { readSingleQueryValue } from '~/utils/routerQuery'
import type {
	RWAPerpsChartMetricKey,
	RWAPerpsChartMode,
	RWAPerpsChartView,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsOverviewTimeSeriesBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsTreemapNestedBy,
	RWAPerpsVenueNonTimeSeriesBreakdown,
	RWAPerpsVenueTimeSeriesBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

export type RWAPerpsTimeSeriesBreakdown = RWAPerpsOverviewTimeSeriesBreakdown | RWAPerpsVenueTimeSeriesBreakdown
export type RWAPerpsNonTimeSeriesBreakdown =
	| RWAPerpsOverviewNonTimeSeriesBreakdown
	| RWAPerpsVenueNonTimeSeriesBreakdown
export type RWAPerpsTreemapBreakdown = RWAPerpsOverviewTreemapBreakdown | RWAPerpsVenueTreemapBreakdown
export type RWAPerpsChartBreakdown =
	| RWAPerpsTimeSeriesBreakdown
	| RWAPerpsNonTimeSeriesBreakdown
	| RWAPerpsTreemapBreakdown

export type RWAPerpsChartState = {
	mode: RWAPerpsChartMode
	view: RWAPerpsChartView
	metric: RWAPerpsChartMetricKey
	breakdown: RWAPerpsChartBreakdown
	treemapNestedBy: RWAPerpsTreemapNestedBy
}

export type RWAPerpsChartOption<T extends string> = {
	key: T
	name: string
}

const CHART_VIEW_OPTIONS: ReadonlyArray<RWAPerpsChartOption<RWAPerpsChartView>> = [
	{ key: 'timeSeries', name: 'Time Series Chart' },
	{ key: 'pie', name: 'Pie Chart' },
	{ key: 'treemap', name: 'Treemap Chart' },
	{ key: 'hbar', name: 'HBar Chart' }
]

const CHART_METRIC_OPTIONS: ReadonlyArray<{ key: RWAPerpsChartMetricKey; label: string }> = [
	{ key: 'openInterest', label: 'Open Interest' },
	{ key: 'volume24h', label: '24h Volume' },
	{ key: 'markets', label: 'Markets' }
]

const BREAKDOWN_LABELS: Record<RWAPerpsChartBreakdown, string> = {
	venue: 'Venue',
	assetClass: 'Asset Class',
	referenceAsset: 'Ref Asset',
	coin: 'Coins'
}

const TREEMAP_NESTED_BY_LABELS: Record<RWAPerpsTreemapNestedBy, string> = {
	none: 'No Grouping',
	venue: 'Venue',
	assetClass: 'Asset Class',
	referenceAsset: 'Ref Asset',
	coin: 'Coins'
}

const TIME_SERIES_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsTimeSeriesBreakdown[]> = {
	overview: ['venue', 'assetClass', 'referenceAsset', 'coin'],
	venue: ['referenceAsset', 'coin', 'assetClass']
}

const NON_TIME_SERIES_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsNonTimeSeriesBreakdown[]> = {
	overview: ['venue', 'assetClass', 'referenceAsset', 'coin'],
	venue: ['referenceAsset', 'coin', 'assetClass']
}

const TREEMAP_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsTreemapBreakdown[]> = {
	overview: ['venue', 'assetClass', 'referenceAsset', 'coin'],
	venue: ['assetClass', 'referenceAsset', 'coin']
}

const TREEMAP_NESTED_BY_OPTIONS: Record<
	RWAPerpsChartMode,
	Partial<Record<RWAPerpsTreemapBreakdown, readonly RWAPerpsTreemapNestedBy[]>>
> = {
	overview: {
		venue: ['none', 'assetClass', 'referenceAsset', 'coin'],
		assetClass: ['none', 'referenceAsset', 'coin'],
		referenceAsset: ['none', 'coin'],
		coin: ['none']
	},
	venue: {
		assetClass: ['none', 'referenceAsset', 'coin'],
		referenceAsset: ['none', 'coin'],
		coin: ['none']
	}
}

const DEFAULT_TREEMAP_NESTED_BY: Record<
	RWAPerpsChartMode,
	Partial<Record<RWAPerpsTreemapBreakdown, RWAPerpsTreemapNestedBy>>
> = {
	overview: {
		venue: 'assetClass',
		assetClass: 'referenceAsset',
		referenceAsset: 'coin',
		coin: 'none'
	},
	venue: {
		assetClass: 'referenceAsset',
		referenceAsset: 'coin',
		coin: 'none'
	}
}

const DEFAULT_CHART_VIEW: RWAPerpsChartView = 'timeSeries'
const DEFAULT_CHART_METRIC: RWAPerpsChartMetricKey = 'openInterest'
const VALID_CHART_VIEWS = new Set<RWAPerpsChartView>(CHART_VIEW_OPTIONS.map((option) => option.key))
const VALID_CHART_METRICS = new Set<RWAPerpsChartMetricKey>(CHART_METRIC_OPTIONS.map((option) => option.key))

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

export function getRWAPerpsChartViewOptions() {
	return CHART_VIEW_OPTIONS
}

export function getRWAPerpsChartMetricOptions() {
	return CHART_METRIC_OPTIONS
}

export function getRWAPerpsChartMetricLabel(metric: RWAPerpsChartMetricKey) {
	const option = CHART_METRIC_OPTIONS.find((item) => item.key === metric)
	assert(option, `Missing RWA perps chart metric label for ${metric}`)
	return option.label
}

export function getRWAPerpsBreakdownLabel(breakdown: RWAPerpsChartBreakdown) {
	return BREAKDOWN_LABELS[breakdown]
}

export function getRWAPerpsTreemapNestedByLabel(nestedBy: RWAPerpsTreemapNestedBy) {
	return TREEMAP_NESTED_BY_LABELS[nestedBy]
}

export function getDefaultRWAPerpsChartBreakdown(
	mode: RWAPerpsChartMode,
	view: RWAPerpsChartView
): RWAPerpsChartBreakdown {
	if (view === 'timeSeries') return TIME_SERIES_BREAKDOWNS[mode][0]
	if (view === 'treemap') return TREEMAP_BREAKDOWNS[mode][0]
	return NON_TIME_SERIES_BREAKDOWNS[mode][0]
}

export function getRWAPerpsChartBreakdownOptions({
	mode,
	view
}: Pick<RWAPerpsChartState, 'mode' | 'view'>): RWAPerpsChartOption<RWAPerpsChartBreakdown>[] {
	const options =
		view === 'timeSeries'
			? TIME_SERIES_BREAKDOWNS[mode]
			: view === 'treemap'
				? TREEMAP_BREAKDOWNS[mode]
				: NON_TIME_SERIES_BREAKDOWNS[mode]
	return options.map((key) => ({ key, name: BREAKDOWN_LABELS[key] }))
}

export function getRWAPerpsTreemapNestedByOptions(
	mode: RWAPerpsChartMode,
	breakdown: RWAPerpsTreemapBreakdown
): RWAPerpsChartOption<RWAPerpsTreemapNestedBy>[] {
	const options = TREEMAP_NESTED_BY_OPTIONS[mode][breakdown]
	assert(options, `Missing RWA perps treemap nested-by options for ${mode}/${breakdown}`)
	return options.map((key) => ({
		key,
		name: TREEMAP_NESTED_BY_LABELS[key]
	}))
}

export function parseRWAPerpsChartState(query: ParsedUrlQuery, mode: RWAPerpsChartMode): RWAPerpsChartState {
	const view = normalizeChartView(readSingleQueryValue(query.chartView))
	const metric = normalizeChartMetric(readSingleQueryValue(query.chartType))
	const breakdown = normalizeBreakdown(mode, view, readSingleQueryValue(query[getBreakdownQueryKey(view)]))
	const treemapNestedBy = normalizeTreemapNestedBy(
		mode,
		view === 'treemap' ? (breakdown as RWAPerpsTreemapBreakdown) : getDefaultRWAPerpsChartBreakdown(mode, 'treemap'),
		readSingleQueryValue(query.treemapNestedBy)
	)

	return { mode, view, metric, breakdown, treemapNestedBy }
}

export function setRWAPerpsChartView(state: RWAPerpsChartState, view: RWAPerpsChartView): RWAPerpsChartState {
	const breakdown = normalizeBreakdown(state.mode, view, state.breakdown)
	const treemapBreakdown =
		view === 'treemap'
			? (breakdown as RWAPerpsTreemapBreakdown)
			: getDefaultRWAPerpsChartBreakdown(state.mode, 'treemap')
	const treemapNestedBy = normalizeTreemapNestedBy(state.mode, treemapBreakdown, state.treemapNestedBy)

	return { ...state, view, breakdown, treemapNestedBy }
}

export function setRWAPerpsChartBreakdown(
	state: RWAPerpsChartState,
	breakdown: RWAPerpsChartBreakdown
): RWAPerpsChartState {
	const allowedBreakdowns = getAllowedBreakdowns(state.mode, state.view)
	assert(
		allowedBreakdowns.includes(breakdown),
		`Invalid RWA perps chart breakdown ${breakdown} for ${state.mode}/${state.view}`
	)
	const treemapBreakdown =
		state.view === 'treemap'
			? (breakdown as RWAPerpsTreemapBreakdown)
			: getDefaultRWAPerpsChartBreakdown(state.mode, 'treemap')
	const treemapNestedBy = normalizeTreemapNestedBy(state.mode, treemapBreakdown, state.treemapNestedBy)

	return { ...state, breakdown, treemapNestedBy }
}

export function setRWAPerpsTreemapNestedBy(
	state: RWAPerpsChartState,
	nestedBy: RWAPerpsTreemapNestedBy
): RWAPerpsChartState {
	const treemapBreakdown =
		state.view === 'treemap'
			? (state.breakdown as RWAPerpsTreemapBreakdown)
			: (getDefaultRWAPerpsChartBreakdown(state.mode, 'treemap') as RWAPerpsTreemapBreakdown)
	const allowedNestedBy = TREEMAP_NESTED_BY_OPTIONS[state.mode][treemapBreakdown]
	assert(allowedNestedBy, `Missing RWA perps treemap nested-by options for ${state.mode}/${treemapBreakdown}`)
	assert(
		allowedNestedBy.includes(nestedBy),
		`Invalid RWA perps treemap nested-by ${nestedBy} for ${state.mode}/${treemapBreakdown}`
	)
	return { ...state, treemapNestedBy: nestedBy }
}

export function getRWAPerpsChartViewQueryValue(view: RWAPerpsChartView) {
	return view === DEFAULT_CHART_VIEW ? undefined : view
}

export function getRWAPerpsChartMetricQueryValue(metric: RWAPerpsChartMetricKey) {
	return metric === DEFAULT_CHART_METRIC ? undefined : metric
}

export function getRWAPerpsChartBreakdownQueryValue(state: RWAPerpsChartState) {
	const defaultBreakdown = getDefaultRWAPerpsChartBreakdown(state.mode, state.view)
	return state.breakdown === defaultBreakdown ? undefined : state.breakdown
}

export function getRWAPerpsTreemapNestedByQueryValue(state: RWAPerpsChartState) {
	const treemapBreakdown =
		state.view === 'treemap'
			? (state.breakdown as RWAPerpsTreemapBreakdown)
			: (getDefaultRWAPerpsChartBreakdown(state.mode, 'treemap') as RWAPerpsTreemapBreakdown)
	const defaultNestedBy = DEFAULT_TREEMAP_NESTED_BY[state.mode][treemapBreakdown]
	assert(defaultNestedBy, `Missing RWA perps treemap nested-by default for ${state.mode}/${treemapBreakdown}`)
	return state.treemapNestedBy === defaultNestedBy ? undefined : state.treemapNestedBy
}

function getAllowedBreakdowns(mode: RWAPerpsChartMode, view: RWAPerpsChartView): readonly RWAPerpsChartBreakdown[] {
	if (view === 'timeSeries') return TIME_SERIES_BREAKDOWNS[mode]
	if (view === 'treemap') return TREEMAP_BREAKDOWNS[mode]
	return NON_TIME_SERIES_BREAKDOWNS[mode]
}

function getBreakdownQueryKey(view: RWAPerpsChartView): 'timeSeriesChartBreakdown' | 'nonTimeSeriesChartBreakdown' {
	return view === 'timeSeries' ? 'timeSeriesChartBreakdown' : 'nonTimeSeriesChartBreakdown'
}

function normalizeChartView(value: string | undefined): RWAPerpsChartView {
	if (value === 'bar') return 'hbar'
	if (value && VALID_CHART_VIEWS.has(value as RWAPerpsChartView)) return value as RWAPerpsChartView
	return DEFAULT_CHART_VIEW
}

function normalizeChartMetric(value: string | undefined): RWAPerpsChartMetricKey {
	if (value && VALID_CHART_METRICS.has(value as RWAPerpsChartMetricKey)) return value as RWAPerpsChartMetricKey
	return DEFAULT_CHART_METRIC
}

function normalizeBreakdown(
	mode: RWAPerpsChartMode,
	view: RWAPerpsChartView,
	value: string | undefined
): RWAPerpsChartBreakdown {
	const allowedBreakdowns = getAllowedBreakdowns(mode, view)
	if (value && allowedBreakdowns.includes(value as RWAPerpsChartBreakdown)) {
		return value as RWAPerpsChartBreakdown
	}

	return getDefaultRWAPerpsChartBreakdown(mode, view)
}

function normalizeTreemapNestedBy(
	mode: RWAPerpsChartMode,
	breakdown: RWAPerpsTreemapBreakdown,
	value: string | undefined
): RWAPerpsTreemapNestedBy {
	const allowedNestedBy = TREEMAP_NESTED_BY_OPTIONS[mode][breakdown]
	assert(allowedNestedBy, `Missing RWA perps treemap nested-by options for ${mode}/${breakdown}`)
	if (value && allowedNestedBy.includes(value as RWAPerpsTreemapNestedBy)) {
		return value as RWAPerpsTreemapNestedBy
	}

	const defaultNestedBy = DEFAULT_TREEMAP_NESTED_BY[mode][breakdown]
	assert(defaultNestedBy, `Missing RWA perps treemap nested-by default for ${mode}/${breakdown}`)
	return defaultNestedBy
}
