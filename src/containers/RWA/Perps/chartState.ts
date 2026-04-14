import type { ParsedUrlQuery } from 'querystring'
import { readSingleQueryValue } from '~/utils/routerQuery'
import type {
	RWAPerpsAssetGroupNonTimeSeriesBreakdown,
	RWAPerpsAssetGroupTimeSeriesBreakdown,
	RWAPerpsAssetGroupTreemapBreakdown,
	RWAPerpsChartMetricKey,
	RWAPerpsChartMode,
	RWAPerpsChartView,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsOverviewTimeSeriesBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsTimeSeriesMode,
	RWAPerpsTreemapNestedBy,
	RWAPerpsVenueNonTimeSeriesBreakdown,
	RWAPerpsVenueTimeSeriesBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

export type RWAPerpsTimeSeriesBreakdown =
	| RWAPerpsOverviewTimeSeriesBreakdown
	| RWAPerpsVenueTimeSeriesBreakdown
	| RWAPerpsAssetGroupTimeSeriesBreakdown
export type RWAPerpsNonTimeSeriesBreakdown =
	| RWAPerpsOverviewNonTimeSeriesBreakdown
	| RWAPerpsVenueNonTimeSeriesBreakdown
	| RWAPerpsAssetGroupNonTimeSeriesBreakdown
export type RWAPerpsTreemapBreakdown =
	| RWAPerpsOverviewTreemapBreakdown
	| RWAPerpsVenueTreemapBreakdown
	| RWAPerpsAssetGroupTreemapBreakdown
export type RWAPerpsChartBreakdown =
	| RWAPerpsTimeSeriesBreakdown
	| RWAPerpsNonTimeSeriesBreakdown
	| RWAPerpsTreemapBreakdown

export type RWAPerpsChartState = {
	mode: RWAPerpsChartMode
	view: RWAPerpsChartView
	metric: RWAPerpsChartMetricKey
	breakdown: RWAPerpsChartBreakdown
	timeSeriesMode: RWAPerpsTimeSeriesMode
	treemapNestedBy: RWAPerpsTreemapNestedBy
}

export type RWAPerpsChartOption<T extends string> = {
	key: T
	name: string
}

export type RWAPerpsChartLabels = {
	openInterest: { label: string }
	markets: { label: string }
	venue: { label: string }
	assetClass: { label: string }
	baseAsset: { label: string }
	assetGroup: { label: string }
	contract: { label: string }
}

const CHART_VIEW_OPTIONS: ReadonlyArray<RWAPerpsChartOption<RWAPerpsChartView>> = [
	{ key: 'timeSeries', name: 'Time Series Chart' },
	{ key: 'pie', name: 'Pie Chart' },
	{ key: 'treemap', name: 'Treemap Chart' },
	{ key: 'hbar', name: 'HBar Chart' }
]

const TIME_SERIES_MODE_OPTIONS: ReadonlyArray<RWAPerpsChartOption<RWAPerpsTimeSeriesMode>> = [
	{ key: 'grouped', name: 'Grouped' },
	{ key: 'breakdown', name: 'Breakdown' }
]

const CHART_METRIC_KEYS: ReadonlyArray<RWAPerpsChartMetricKey> = ['openInterest', 'volume24h', 'markets']

const TIME_SERIES_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsTimeSeriesBreakdown[]> = {
	overview: ['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'],
	venue: ['assetGroup', 'baseAsset', 'contract', 'assetClass'],
	assetGroup: ['baseAsset', 'venue', 'assetClass', 'contract']
}

const NON_TIME_SERIES_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsNonTimeSeriesBreakdown[]> = {
	overview: ['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'],
	venue: ['assetGroup', 'baseAsset', 'contract', 'assetClass'],
	assetGroup: ['baseAsset', 'venue', 'assetClass', 'contract']
}

const TREEMAP_BREAKDOWNS: Record<RWAPerpsChartMode, readonly RWAPerpsTreemapBreakdown[]> = {
	overview: ['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'],
	venue: ['assetGroup', 'baseAsset', 'assetClass', 'contract'],
	assetGroup: ['baseAsset', 'venue', 'assetClass', 'contract']
}

const TREEMAP_NESTED_BY_OPTIONS: Record<
	RWAPerpsChartMode,
	Partial<Record<RWAPerpsTreemapBreakdown, readonly RWAPerpsTreemapNestedBy[]>>
> = {
	overview: {
		venue: ['none', 'assetClass', 'baseAsset', 'contract'],
		assetGroup: ['none', 'baseAsset', 'assetClass', 'contract'],
		assetClass: ['none', 'baseAsset', 'contract'],
		baseAsset: ['none', 'contract'],
		contract: ['none']
	},
	venue: {
		assetGroup: ['none', 'baseAsset', 'assetClass', 'contract'],
		assetClass: ['none', 'baseAsset', 'contract'],
		baseAsset: ['none', 'contract'],
		contract: ['none']
	},
	assetGroup: {
		venue: ['none', 'baseAsset', 'assetClass', 'contract'],
		assetClass: ['none', 'baseAsset', 'contract'],
		baseAsset: ['none', 'contract'],
		contract: ['none']
	}
}

const DEFAULT_TREEMAP_NESTED_BY: Record<
	RWAPerpsChartMode,
	Partial<Record<RWAPerpsTreemapBreakdown, RWAPerpsTreemapNestedBy>>
> = {
	overview: {
		venue: 'assetClass',
		assetGroup: 'baseAsset',
		assetClass: 'baseAsset',
		baseAsset: 'contract',
		contract: 'none'
	},
	venue: {
		assetGroup: 'baseAsset',
		assetClass: 'baseAsset',
		baseAsset: 'contract',
		contract: 'none'
	},
	assetGroup: {
		venue: 'baseAsset',
		assetClass: 'baseAsset',
		baseAsset: 'contract',
		contract: 'none'
	}
}

export const DEFAULT_CHART_VIEW: RWAPerpsChartView = 'treemap'
const DEFAULT_CHART_METRIC: RWAPerpsChartMetricKey = 'openInterest'
const DEFAULT_TIME_SERIES_MODE: RWAPerpsTimeSeriesMode = 'grouped'
const VALID_CHART_VIEWS = new Set<RWAPerpsChartView>(CHART_VIEW_OPTIONS.map((option) => option.key))
const VALID_CHART_METRICS = new Set<RWAPerpsChartMetricKey>(CHART_METRIC_KEYS)
const VALID_TIME_SERIES_MODES = new Set<RWAPerpsTimeSeriesMode>(TIME_SERIES_MODE_OPTIONS.map((option) => option.key))

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

export function getRWAPerpsChartViewOptions() {
	return CHART_VIEW_OPTIONS
}

export function getRWAPerpsTimeSeriesModeOptions() {
	return TIME_SERIES_MODE_OPTIONS
}

export function getRWAPerpsChartMetricOptions(labels: RWAPerpsChartLabels) {
	return CHART_METRIC_KEYS.map((key) => ({
		key,
		name: key === 'volume24h' ? 'Volume' : labels[key].label
	}))
}

export function getRWAPerpsChartMetricLabel(metric: RWAPerpsChartMetricKey, labels: RWAPerpsChartLabels) {
	const option = getRWAPerpsChartMetricOptions(labels).find((item) => item.key === metric)
	assert(option, `Missing RWA perps chart metric label for ${metric}`)
	return option.name
}

export function getRWAPerpsBreakdownLabel(breakdown: RWAPerpsChartBreakdown, labels: RWAPerpsChartLabels) {
	switch (breakdown) {
		case 'venue':
			return labels.venue.label
		case 'assetClass':
			return labels.assetClass.label
		case 'baseAsset':
			return labels.baseAsset.label
		case 'assetGroup':
			return labels.assetGroup.label
		case 'contract':
			return labels.contract.label
	}
}

export function getRWAPerpsTreemapNestedByLabel(nestedBy: RWAPerpsTreemapNestedBy, labels: RWAPerpsChartLabels) {
	switch (nestedBy) {
		case 'none':
			return 'No Grouping'
		case 'venue':
			return labels.venue.label
		case 'assetClass':
			return labels.assetClass.label
		case 'baseAsset':
			return labels.baseAsset.label
		case 'contract':
			return labels.contract.label
	}
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
	view,
	labels
}: Pick<RWAPerpsChartState, 'mode' | 'view'> & {
	labels: RWAPerpsChartLabels
}): RWAPerpsChartOption<RWAPerpsChartBreakdown>[] {
	const options =
		view === 'timeSeries'
			? TIME_SERIES_BREAKDOWNS[mode]
			: view === 'treemap'
				? TREEMAP_BREAKDOWNS[mode]
				: NON_TIME_SERIES_BREAKDOWNS[mode]
	return options.map((key) => ({ key, name: getRWAPerpsBreakdownLabel(key, labels) }))
}

export function getRWAPerpsTreemapNestedByOptions(
	mode: RWAPerpsChartMode,
	breakdown: RWAPerpsTreemapBreakdown,
	labels: RWAPerpsChartLabels
): RWAPerpsChartOption<RWAPerpsTreemapNestedBy>[] {
	const options = TREEMAP_NESTED_BY_OPTIONS[mode][breakdown]
	assert(options, `Missing RWA perps treemap nested-by options for ${mode}/${breakdown}`)
	return options.map((key) => ({
		key,
		name: getRWAPerpsTreemapNestedByLabel(key, labels)
	}))
}

export function parseRWAPerpsChartState(query: ParsedUrlQuery, mode: RWAPerpsChartMode): RWAPerpsChartState {
	const view = normalizeChartView(readSingleQueryValue(query.chartView))
	const metric = normalizeChartMetric(readSingleQueryValue(query.chartType))
	const breakdown = normalizeBreakdown(mode, view, readSingleQueryValue(query[getBreakdownQueryKey(view)]))
	const timeSeriesMode = normalizeTimeSeriesMode(readSingleQueryValue(query.timeSeriesMode))
	const treemapNestedBy = normalizeTreemapNestedBy(
		mode,
		view === 'treemap' ? (breakdown as RWAPerpsTreemapBreakdown) : getDefaultRWAPerpsChartBreakdown(mode, 'treemap'),
		readSingleQueryValue(query.treemapNestedBy)
	)

	return { mode, view, metric, breakdown, timeSeriesMode, treemapNestedBy }
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

export function setRWAPerpsTimeSeriesMode(
	state: RWAPerpsChartState,
	timeSeriesMode: RWAPerpsTimeSeriesMode
): RWAPerpsChartState {
	return { ...state, timeSeriesMode }
}

export function getRWAPerpsChartViewQueryValue(view: RWAPerpsChartView) {
	return view === DEFAULT_CHART_VIEW ? undefined : view
}

export function getRWAPerpsChartMetricQueryValue(metric: RWAPerpsChartMetricKey) {
	return metric === DEFAULT_CHART_METRIC ? undefined : metric
}

export function getRWAPerpsTimeSeriesModeQueryValue(timeSeriesMode: RWAPerpsTimeSeriesMode) {
	return timeSeriesMode === DEFAULT_TIME_SERIES_MODE ? undefined : timeSeriesMode
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

function normalizeTimeSeriesMode(value: string | undefined): RWAPerpsTimeSeriesMode {
	if (value && VALID_TIME_SERIES_MODES.has(value as RWAPerpsTimeSeriesMode)) {
		return value as RWAPerpsTimeSeriesMode
	}

	return DEFAULT_TIME_SERIES_MODE
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
