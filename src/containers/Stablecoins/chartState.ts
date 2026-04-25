import type { ParsedUrlQuery } from 'querystring'
import { readSingleQueryValue } from '~/utils/routerQuery'

export type StablecoinChartType = 'marketCap' | 'volume' | 'inflows'
export type StablecoinChartView =
	| 'total'
	| 'breakdown'
	| 'dominance'
	| 'pie'
	| 'hbar'
	| 'treemap'
	| 'byToken'
	| 'byChain'
	| 'byCurrency'
	| 'usd'
	| 'token'

export type StablecoinChartMode = { page: 'overview'; chain: 'all' | 'chain' } | { page: 'chains' } | { page: 'asset' }

export type StablecoinChartOption<T extends string> = { key: T; name: string }

export type StablecoinChartState = {
	mode: StablecoinChartMode
	type: StablecoinChartType
	view: StablecoinChartView
}

const TYPE_OPTIONS: Record<StablecoinChartType, StablecoinChartOption<StablecoinChartType>> = {
	marketCap: { key: 'marketCap', name: 'Market Cap' },
	volume: { key: 'volume', name: 'Volume' },
	inflows: { key: 'inflows', name: 'Inflows' }
}

const VIEW_OPTIONS: Record<StablecoinChartView, StablecoinChartOption<StablecoinChartView>> = {
	total: { key: 'total', name: 'Total' },
	breakdown: { key: 'breakdown', name: 'Breakdown' },
	dominance: { key: 'dominance', name: 'Dominance' },
	pie: { key: 'pie', name: 'Pie' },
	hbar: { key: 'hbar', name: 'HBar' },
	treemap: { key: 'treemap', name: 'Treemap' },
	byToken: { key: 'byToken', name: 'By Token' },
	byChain: { key: 'byChain', name: 'By Chain' },
	byCurrency: { key: 'byCurrency', name: 'By Currency' },
	usd: { key: 'usd', name: 'USD Inflows' },
	token: { key: 'token', name: 'Token Inflows' }
}

const MARKET_CAP_VIEWS = ['total', 'breakdown', 'dominance', 'pie', 'hbar', 'treemap'] as const
const ASSET_MARKET_CAP_VIEWS = ['total', 'breakdown', 'dominance', 'pie'] as const
const VOLUME_VIEWS = ['total', 'byToken', 'byChain', 'byCurrency'] as const
const CHAIN_VOLUME_VIEWS = ['total', 'byToken', 'byCurrency'] as const
const ASSET_VOLUME_VIEWS = ['total', 'byChain'] as const
const INFLOW_VIEWS = ['usd', 'token'] as const

function assertNever(value: never): never {
	throw new Error(`Unexpected stablecoin chart state: ${String(value)}`)
}

export function createStablecoinOverviewChartMode(selectedChain: string): StablecoinChartMode {
	return { page: 'overview', chain: selectedChain === 'All' ? 'all' : 'chain' }
}

export function parseStablecoinChartState(query: ParsedUrlQuery, mode: StablecoinChartMode): StablecoinChartState {
	const type = normalizeChartType(readSingleQueryValue(query.chartType), mode)
	const view = normalizeChartView(readSingleQueryValue(query.chartView), mode, type)
	return { mode, type, view }
}

export function getStablecoinChartTypeOptions(
	mode: StablecoinChartMode
): ReadonlyArray<StablecoinChartOption<StablecoinChartType>> {
	return getAllowedTypes(mode).map((key) => TYPE_OPTIONS[key])
}

export function getStablecoinChartViewOptions(
	state: Pick<StablecoinChartState, 'mode' | 'type'>
): ReadonlyArray<StablecoinChartOption<StablecoinChartView>> {
	return getAllowedViews(state.mode, state.type).map((key) => VIEW_OPTIONS[key])
}

export function getStablecoinChartTypeLabel(type: StablecoinChartType): string {
	return TYPE_OPTIONS[type].name
}

export function getStablecoinChartViewLabel(view: StablecoinChartView): string {
	return VIEW_OPTIONS[view].name
}

export function getDefaultStablecoinChartType(mode: StablecoinChartMode): StablecoinChartType {
	switch (mode.page) {
		case 'overview':
		case 'chains':
		case 'asset':
			return 'marketCap'
		default:
			return assertNever(mode)
	}
}

export function getDefaultStablecoinChartView(
	mode: StablecoinChartMode,
	type: StablecoinChartType
): StablecoinChartView {
	if (type === 'volume') return 'total'
	if (type === 'inflows') return 'usd'
	switch (mode.page) {
		case 'overview':
			return 'total'
		case 'chains':
		case 'asset':
			return 'pie'
		default:
			return assertNever(mode)
	}
}

export function getStablecoinChartTypeQueryValue(
	mode: StablecoinChartMode,
	type: StablecoinChartType
): string | undefined {
	return type === getDefaultStablecoinChartType(mode) ? undefined : type
}

export function getStablecoinChartViewQueryValue(
	mode: StablecoinChartMode,
	type: StablecoinChartType,
	view: StablecoinChartView
): string | undefined {
	return view === getDefaultStablecoinChartView(mode, type) ? undefined : view
}

function normalizeChartType(value: string | undefined, mode: StablecoinChartMode): StablecoinChartType {
	const allowedTypes = getAllowedTypes(mode)
	if (value && allowedTypes.includes(value as StablecoinChartType)) return value as StablecoinChartType
	return getDefaultStablecoinChartType(mode)
}

function normalizeChartView(
	value: string | undefined,
	mode: StablecoinChartMode,
	type: StablecoinChartType
): StablecoinChartView {
	const allowedViews = getAllowedViews(mode, type)
	if (value && allowedViews.includes(value as StablecoinChartView)) return value as StablecoinChartView
	return getDefaultStablecoinChartView(mode, type)
}

function getAllowedTypes(mode: StablecoinChartMode): readonly StablecoinChartType[] {
	switch (mode.page) {
		case 'overview':
			return ['marketCap', 'volume', 'inflows']
		case 'chains':
		case 'asset':
			return ['marketCap', 'volume']
		default:
			return assertNever(mode)
	}
}

function getAllowedViews(mode: StablecoinChartMode, type: StablecoinChartType): readonly StablecoinChartView[] {
	if (type === 'inflows') return mode.page === 'overview' ? INFLOW_VIEWS : []
	if (type === 'volume') {
		if (mode.page === 'overview' && mode.chain === 'chain') return CHAIN_VOLUME_VIEWS
		if (mode.page === 'asset') return ASSET_VOLUME_VIEWS
		return VOLUME_VIEWS
	}
	if (mode.page === 'asset') return ASSET_MARKET_CAP_VIEWS
	return MARKET_CAP_VIEWS
}
