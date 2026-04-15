import dayjs from 'dayjs'
import { chartDatasetsBySlug, type ChartDatasetDefinition } from './chart-datasets'
import type { DatasetDefinition } from './datasets'

export type SavedDownloadKind = 'dataset' | 'chart' | 'multiMetric'
export type SavedSortDir = 'asc' | 'desc'
export type SavedParamType = 'protocol' | 'chain'

export interface SavedSort {
	column: string
	dir: SavedSortDir
}

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'ytd' | 'all'

// Relative presets re-apply against "now" every time the config runs — a preset saved
// as "last 7 days" keeps rolling. Custom windows are absolute, for frozen reports.
export type DateRangeConfig = { kind: 'preset'; preset: DateRangePreset } | { kind: 'custom'; from: string; to: string } // ISO YYYY-MM-DD, inclusive

interface SavedDownloadBase {
	id: string
	name: string
	createdAt: number
	lastRunAt?: number
}

export interface DatasetSavedConfig extends SavedDownloadBase {
	kind: 'dataset'
	slug: string
	columns: string[]
	sort?: SavedSort
	chain?: string
	exclude?: Record<string, boolean>
	rowLimit?: number
}

export interface ChartSavedConfig extends SavedDownloadBase {
	kind: 'chart'
	slug: string
	params: string[]
	paramLabels?: string[]
	columns?: string[]
	sort?: SavedSort
	dateRange?: DateRangeConfig
}

export interface MultiMetricSavedConfig extends SavedDownloadBase {
	kind: 'multiMetric'
	paramType: SavedParamType
	param: string
	paramLabel?: string
	metrics: string[]
	dateRange?: DateRangeConfig
}

export type SavedDownload = DatasetSavedConfig | ChartSavedConfig | MultiMetricSavedConfig

// Distributed Omit preserves discrimination across the union.
type DistributedOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
export type SavedDownloadInput = DistributedOmit<SavedDownload, 'id' | 'name' | 'createdAt'>
export type DatasetInput = DistributedOmit<DatasetSavedConfig, 'id' | 'name' | 'createdAt'>
export type ChartInput = DistributedOmit<ChartSavedConfig, 'id' | 'name' | 'createdAt'>
export type MultiMetricInput = DistributedOmit<MultiMetricSavedConfig, 'id' | 'name' | 'createdAt'>

export const MAX_RECENT_DOWNLOADS = 10

// ID generation — crypto.randomUUID is available in Node 19+ and all modern browsers.
// Fallback to Math.random for older environments.
export function generatePresetId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return `sd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// --- Extract helpers: turn current modal state into a SavedDownload (without id/name/createdAt) ---

export interface DatasetExtractInput {
	slug: string
	headers: string[]
	selectedColumns: Set<number> | null
	sort?: { index: number; direction: SavedSortDir } | null
	chain?: string | null
	exclude?: Record<string, boolean>
	rowLimit?: number | null
}

export function extractDatasetConfig(input: DatasetExtractInput): DatasetInput {
	const selected = input.selectedColumns
	const columns =
		selected && selected.size > 0 ? input.headers.filter((_, i) => selected.has(i)) : input.headers.slice()
	const sort =
		input.sort && input.headers[input.sort.index]
			? { column: input.headers[input.sort.index], dir: input.sort.direction }
			: undefined
	const exclude = input.exclude && Object.keys(input.exclude).length > 0 ? { ...input.exclude } : undefined
	const rowLimit = input.rowLimit && input.rowLimit > 0 ? input.rowLimit : undefined
	return {
		kind: 'dataset',
		slug: input.slug,
		columns,
		...(sort ? { sort } : {}),
		...(input.chain ? { chain: input.chain } : {}),
		...(exclude ? { exclude } : {}),
		...(rowLimit ? { rowLimit } : {})
	}
}

export interface ChartExtractInput {
	slug: string
	headers: string[]
	selectedParams: Array<{ label: string; value: string }>
	selectedColumns: Set<number> | null
	sort?: { index: number; direction: SavedSortDir } | null
	dateRange?: DateRangeConfig | null
}

export function extractChartConfig(input: ChartExtractInput): ChartInput {
	const selected = input.selectedColumns
	const isSinglePreview = input.selectedParams.length === 1
	const columns =
		isSinglePreview && selected && selected.size > 0 && selected.size !== input.headers.length
			? input.headers.filter((_, i) => selected.has(i))
			: undefined
	const sort =
		input.sort && input.headers[input.sort.index]
			? { column: input.headers[input.sort.index], dir: input.sort.direction }
			: undefined
	const labels = input.selectedParams.map((p) => p.label)
	const hasUsefulLabels = labels.some((label, i) => label && label !== input.selectedParams[i].value)
	const dateRange = normalizeDateRange(input.dateRange ?? null)
	return {
		kind: 'chart',
		slug: input.slug,
		params: input.selectedParams.map((p) => p.value),
		...(hasUsefulLabels ? { paramLabels: labels } : {}),
		...(columns ? { columns } : {}),
		...(sort ? { sort } : {}),
		...(dateRange ? { dateRange } : {})
	}
}

export interface MultiMetricExtractInput {
	paramType: SavedParamType
	param: string
	paramLabel?: string
	metrics: string[]
	dateRange?: DateRangeConfig | null
}

export function extractMultiMetricConfig(input: MultiMetricExtractInput): MultiMetricInput {
	const dateRange = normalizeDateRange(input.dateRange ?? null)
	return {
		kind: 'multiMetric',
		paramType: input.paramType,
		param: input.param,
		...(input.paramLabel ? { paramLabel: input.paramLabel } : {}),
		metrics: input.metrics.slice(),
		...(dateRange ? { dateRange } : {})
	}
}

// "all" is the default / no-filter state — drop it at save time so saved configs,
// default-named configs, and dedup all treat unset and `all` as equivalent.
function normalizeDateRange(range: DateRangeConfig | null): DateRangeConfig | null {
	if (!range) return null
	if (range.kind === 'preset' && range.preset === 'all') return null
	if (range.kind === 'custom' && (!range.from || !range.to)) return null
	return range
}

// --- Apply helpers: map a saved config onto current schema, surfacing drift ---

export interface AppliedDatasetConfig {
	selectedColumns: Set<number>
	sort: { index: number; direction: SavedSortDir } | null
	chain: string | null
	exclude: Record<string, boolean>
	rowLimit: number | null
	missingColumns: string[]
	missingSortColumn: string | null
}

export function applyDatasetConfig(config: DatasetSavedConfig, headers: string[]): AppliedDatasetConfig {
	const headerToIndex = new Map<string, number>()
	headers.forEach((h, i) => headerToIndex.set(h, i))

	const selected = new Set<number>()
	const missingColumns: string[] = []
	for (const col of config.columns) {
		const idx = headerToIndex.get(col)
		if (idx === undefined) {
			missingColumns.push(col)
		} else {
			selected.add(idx)
		}
	}

	// If all saved columns are missing, fall back to all columns (rather than a blank table)
	if (selected.size === 0 && headers.length > 0) {
		headers.forEach((_, i) => selected.add(i))
	}

	let sort: { index: number; direction: SavedSortDir } | null = null
	let missingSortColumn: string | null = null
	if (config.sort) {
		const idx = headerToIndex.get(config.sort.column)
		if (idx === undefined) {
			missingSortColumn = config.sort.column
		} else {
			sort = { index: idx, direction: config.sort.dir }
		}
	}

	return {
		selectedColumns: selected,
		sort,
		chain: config.chain ?? null,
		exclude: config.exclude ? { ...config.exclude } : {},
		rowLimit: config.rowLimit && config.rowLimit > 0 ? config.rowLimit : null,
		missingColumns,
		missingSortColumn
	}
}

export interface AppliedChartConfig {
	params: Array<{ label: string; value: string }>
	selectedColumns: Set<number> | null
	sort: { index: number; direction: SavedSortDir } | null
	missingParams: string[]
	missingColumns: string[]
	missingSortColumn: string | null
}

export function applyChartParams(
	config: ChartSavedConfig,
	options: Array<{ label: string; value: string }>
): { params: Array<{ label: string; value: string }>; missingParams: string[] } {
	const optionByValue = new Map<string, { label: string; value: string }>()
	for (const opt of options) optionByValue.set(opt.value, opt)

	const params: Array<{ label: string; value: string }> = []
	const missingParams: string[] = []
	for (const value of config.params) {
		const opt = optionByValue.get(value)
		if (opt) params.push(opt)
		else missingParams.push(value)
	}
	return { params, missingParams }
}

export function applyChartColumnsAndSort(
	config: ChartSavedConfig,
	headers: string[]
): {
	selectedColumns: Set<number> | null
	sort: { index: number; direction: SavedSortDir } | null
	missingColumns: string[]
	missingSortColumn: string | null
} {
	const headerToIndex = new Map<string, number>()
	headers.forEach((h, i) => headerToIndex.set(h, i))

	let selectedColumns: Set<number> | null = null
	const missingColumns: string[] = []
	if (config.columns && config.columns.length > 0) {
		const selected = new Set<number>()
		for (const col of config.columns) {
			const idx = headerToIndex.get(col)
			if (idx === undefined) missingColumns.push(col)
			else selected.add(idx)
		}
		if (selected.size === 0 && headers.length > 0) {
			headers.forEach((_, i) => selected.add(i))
		}
		selectedColumns = selected
	}

	let sort: { index: number; direction: SavedSortDir } | null = null
	let missingSortColumn: string | null = null
	if (config.sort) {
		const idx = headerToIndex.get(config.sort.column)
		if (idx === undefined) {
			missingSortColumn = config.sort.column
		} else {
			sort = { index: idx, direction: config.sort.dir }
		}
	}

	return { selectedColumns, sort, missingColumns, missingSortColumn }
}

export interface AppliedMultiMetricConfig {
	paramType: SavedParamType
	param: { label: string; value: string } | null
	metrics: string[]
	missingParam: boolean
	missingMetrics: string[]
}

export function applyMultiMetricConfig(
	config: MultiMetricSavedConfig,
	paramOptions: Array<{ label: string; value: string }>,
	validMetricSlugs: Set<string>
): AppliedMultiMetricConfig {
	const opt = paramOptions.find((o) => o.value === config.param) ?? null
	const metrics: string[] = []
	const missingMetrics: string[] = []
	for (const slug of config.metrics) {
		if (validMetricSlugs.has(slug)) metrics.push(slug)
		else missingMetrics.push(slug)
	}
	return {
		paramType: config.paramType,
		param: opt,
		metrics,
		missingParam: !opt,
		missingMetrics
	}
}

// --- Naming and display ---

const MAX_LISTED_ITEMS = 3

function formatListWithOverflow(items: string[], max: number = MAX_LISTED_ITEMS): string {
	if (items.length === 0) return ''
	if (items.length <= max) return items.join(', ')
	return `${items.slice(0, max).join(', ')} +${items.length - max}`
}

// Short label used in preset names & describe strings. "Last 7d", "YTD", "Jan 1 – Mar 31".
export function formatDateRangeShort(range: DateRangeConfig): string {
	if (range.kind === 'preset') {
		switch (range.preset) {
			case '7d':
				return 'Last 7d'
			case '30d':
				return 'Last 30d'
			case '90d':
				return 'Last 90d'
			case '1y':
				return 'Last 1y'
			case 'ytd':
				return 'YTD'
			case 'all':
				return 'All time'
		}
	}
	const from = dayjs(range.from)
	const to = dayjs(range.to)
	if (!from.isValid() || !to.isValid()) return 'Custom range'
	const fy = from.year()
	const ty = to.year()
	const cy = dayjs().year()
	if (fy === ty) {
		if (fy === cy) return `${from.format('MMM D')} – ${to.format('MMM D')}`
		return `${from.format('MMM D')} – ${to.format("MMM D 'YY")}`
	}
	return `${from.format("MMM D 'YY")} – ${to.format("MMM D 'YY")}`
}

// Longer label used in the picker trigger when a filter is active.
export function formatDateRangeLong(range: DateRangeConfig): string {
	if (range.kind === 'preset') {
		switch (range.preset) {
			case '7d':
				return 'Last 7 days'
			case '30d':
				return 'Last 30 days'
			case '90d':
				return 'Last 90 days'
			case '1y':
				return 'Last 1 year'
			case 'ytd':
				return 'Year to date'
			case 'all':
				return 'All time'
		}
	}
	const from = dayjs(range.from)
	const to = dayjs(range.to)
	if (!from.isValid() || !to.isValid()) return 'Custom range'
	const fy = from.year()
	const ty = to.year()
	const cy = dayjs().year()
	if (fy === ty && fy === cy) return `${from.format('MMM D')} – ${to.format('MMM D')}`
	if (fy === ty) return `${from.format('MMM D')} – ${to.format('MMM D, YYYY')}`
	return `${from.format('MMM D, YYYY')} – ${to.format('MMM D, YYYY')}`
}

function prettyMetricName(slug: string): string {
	const d = chartDatasetsBySlug.get(slug)
	if (!d) return slug
	// e.g. "Protocol TVL Chart" -> "TVL", "Chain Stablecoins Mcap" -> "Stablecoins Mcap"
	return d.name
		.replace(/^(Protocol|Chain)\s+/i, '')
		.replace(/\s+Chart$/i, '')
		.trim()
}

function chartParamDisplayLabels(config: Pick<ChartSavedConfig, 'params' | 'paramLabels'>): string[] {
	if (config.paramLabels && config.paramLabels.length === config.params.length) {
		return config.paramLabels
	}
	return config.params
}

export function defaultPresetName(config: SavedDownloadInput, datasetLabel?: string): string {
	if (config.kind === 'dataset') {
		const base = datasetLabel ?? config.slug
		const modifiers: string[] = []
		if (config.chain) modifiers.push(config.chain)
		// List columns when the user picked a small subset; otherwise the name stays clean.
		if (config.columns.length > 0 && config.columns.length <= MAX_LISTED_ITEMS) {
			modifiers.push(config.columns.join(', '))
		}
		if (config.rowLimit && config.rowLimit > 0) {
			modifiers.push(`Top ${config.rowLimit.toLocaleString()}`)
		}
		return modifiers.length > 0 ? `${base} — ${modifiers.join(' · ')}` : base
	}
	if (config.kind === 'chart') {
		const base = datasetLabel ?? config.slug
		const parts: string[] = []
		if (config.params.length > 0) parts.push(formatListWithOverflow(chartParamDisplayLabels(config)))
		if (config.dateRange) parts.push(formatDateRangeShort(config.dateRange))
		return parts.length > 0 ? `${base} — ${parts.join(' · ')}` : base
	}
	// multiMetric
	const who = config.paramLabel ?? config.param
	const parts: string[] = []
	if (config.metrics.length > 0) parts.push(formatListWithOverflow(config.metrics.map(prettyMetricName)))
	if (config.dateRange) parts.push(formatDateRangeShort(config.dateRange))
	return parts.length > 0 ? `${who} — ${parts.join(' · ')}` : who
}

export function describeSavedConfig(config: SavedDownload): string {
	if (config.kind === 'dataset') {
		const parts: string[] = []
		// Only note column count when it's big enough that the name couldn't fit it.
		if (config.columns.length > MAX_LISTED_ITEMS) {
			parts.push(`${config.columns.length} cols`)
		}
		if (config.sort) parts.push(`${config.sort.column} ${config.sort.dir}`)
		if (config.exclude) {
			const active = Object.entries(config.exclude)
				.filter(([, v]) => v)
				.map(([k]) => `excl. ${k}`)
			parts.push(...active)
		}
		// Only show rowLimit here when the name didn't already include it (see defaultPresetName).
		// Duplicating it in the name+description reads noisy, but users rename presets, so we
		// still surface it here for safety.
		if (config.rowLimit && config.rowLimit > 0) parts.push(`top ${config.rowLimit.toLocaleString()}`)
		return parts.join(' · ')
	}
	if (config.kind === 'chart') {
		const parts: string[] = []
		// Only note param count when it overflowed the name's "+N" already.
		if (config.params.length > MAX_LISTED_ITEMS) {
			parts.push(`${config.params.length} items`)
		}
		if (config.columns && config.columns.length > 0) {
			parts.push(`${config.columns.length} col${config.columns.length === 1 ? '' : 's'} selected`)
		}
		if (config.sort) parts.push(`${config.sort.column} ${config.sort.dir}`)
		if (config.dateRange) parts.push(formatDateRangeShort(config.dateRange).toLowerCase())
		return parts.join(' · ')
	}
	// multiMetric — name lists metrics; only show count when it overflowed.
	const parts: string[] = []
	if (config.metrics.length > MAX_LISTED_ITEMS) {
		parts.push(`${config.metrics.length} metrics combined`)
	}
	if (config.dateRange) parts.push(formatDateRangeShort(config.dateRange).toLowerCase())
	return parts.join(' · ')
}

export function lookupDatasetLabel(slug: string, datasetMap: Map<string, DatasetDefinition>): string | undefined {
	return datasetMap.get(slug)?.name
}

export function lookupChartDatasetLabel(
	slug: string,
	chartDatasetMap: Map<string, ChartDatasetDefinition>
): string | undefined {
	return chartDatasetMap.get(slug)?.name
}

// --- Recents dedup: compare configs by their "shape" (ignoring id/name/timestamps) ---

function sortedArray(arr: string[]): string[] {
	return arr.slice().sort()
}

export function sameSavedConfigShape(a: SavedDownload, b: SavedDownload): boolean {
	if (a.kind !== b.kind) return false
	if (a.kind === 'dataset' && b.kind === 'dataset') {
		if (a.slug !== b.slug) return false
		if (a.chain !== b.chain) return false
		if (JSON.stringify(sortedArray(a.columns)) !== JSON.stringify(sortedArray(b.columns))) return false
		if (JSON.stringify(a.sort ?? null) !== JSON.stringify(b.sort ?? null)) return false
		if (JSON.stringify(a.exclude ?? null) !== JSON.stringify(b.exclude ?? null)) return false
		if ((a.rowLimit ?? null) !== (b.rowLimit ?? null)) return false
		return true
	}
	if (a.kind === 'chart' && b.kind === 'chart') {
		if (a.slug !== b.slug) return false
		if (JSON.stringify(sortedArray(a.params)) !== JSON.stringify(sortedArray(b.params))) return false
		if (
			JSON.stringify(a.columns ? sortedArray(a.columns) : null) !==
			JSON.stringify(b.columns ? sortedArray(b.columns) : null)
		)
			return false
		if (JSON.stringify(a.sort ?? null) !== JSON.stringify(b.sort ?? null)) return false
		if (JSON.stringify(a.dateRange ?? null) !== JSON.stringify(b.dateRange ?? null)) return false
		return true
	}
	if (a.kind === 'multiMetric' && b.kind === 'multiMetric') {
		if (a.paramType !== b.paramType) return false
		if (a.param !== b.param) return false
		if (JSON.stringify(sortedArray(a.metrics)) !== JSON.stringify(sortedArray(b.metrics))) return false
		if (JSON.stringify(a.dateRange ?? null) !== JSON.stringify(b.dateRange ?? null)) return false
		return true
	}
	return false
}
