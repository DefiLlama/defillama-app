import type { ChartConfig, ChartType, NumberFormat, StackMode } from './sql/chartConfig'
import type {
	ChartInput,
	DatasetInput,
	DateRangeConfig,
	DateRangePreset,
	MultiMetricInput,
	QueryInput,
	QueryTableRef,
	SavedDownloadInput,
	SavedParamType,
	SavedSort
} from './savedDownloads'

// Query-param keys are kept short so deep links stay under practical URL lengths
// and remain human-readable / hand-editable. JSON-stringifying the whole config
// would bloat URLs with percent-encoded braces and quotes.
//
// Round-trip fixtures (verified manually):
//   dataset:    { kind:'dataset', slug:'chains', columns:['name','tvl'], sort:{column:'tvl',dir:'desc'}, chain:'ethereum' }
//               → ?k=dataset&s=chains&c=name,tvl&sort=tvl:desc&chain=ethereum
//   chart:      { kind:'chart', slug:'protocol-tvl-chart', params:['aave'], dateRange:{kind:'preset',preset:'30d'} }
//               → ?k=chart&s=protocol-tvl-chart&p=aave&dr=30d
//   multi:      { kind:'multiMetric', paramType:'protocol', param:'aave', metrics:['tvl','fees'] }
//               → ?k=multi&pt=protocol&pm=aave&mt=tvl,fees

const DATE_PRESETS: readonly DateRangePreset[] = ['7d', '30d', '90d', '1y', 'ytd', 'all']

// Encode column names that contain `,` or `\` so comma-joined arrays round-trip cleanly.
function escapeItem(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,')
}

function unescapeItem(s: string): string {
	return s.replace(/\\,/g, ',').replace(/\\\\/g, '\\')
}

function joinEscaped(items: readonly string[]): string {
	return items.map(escapeItem).join(',')
}

function splitEscaped(s: string): string[] {
	const out: string[] = []
	let buf = ''
	let i = 0
	while (i < s.length) {
		const ch = s[i]
		if (ch === '\\' && i + 1 < s.length) {
			buf += s[i + 1]
			i += 2
			continue
		}
		if (ch === ',') {
			out.push(buf)
			buf = ''
			i += 1
			continue
		}
		buf += ch
		i += 1
	}
	out.push(buf)
	return out.map(unescapeItem)
}

function encodeDateRange(range: DateRangeConfig): string {
	if (range.kind === 'preset') return range.preset
	return `${range.from}..${range.to}`
}

function decodeDateRange(s: string): DateRangeConfig | null {
	if ((DATE_PRESETS as readonly string[]).includes(s)) {
		return { kind: 'preset', preset: s as DateRangePreset }
	}
	const [from, to] = s.split('..')
	if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
		return { kind: 'custom', from, to }
	}
	return null
}

function encodeSort(sort: SavedSort): string {
	// Only `:` is the delimiter here; commas aren't special in a single-token value.
	const col = sort.column.replace(/\\/g, '\\\\').replace(/:/g, '\\:')
	return `${col}:${sort.dir}`
}

function decodeSort(s: string): SavedSort | null {
	const m = s.match(/^(.*):(asc|desc)$/)
	if (!m) return null
	const column = m[1].replace(/\\:/g, ':').replace(/\\\\/g, '\\')
	return { column, dir: m[2] as 'asc' | 'desc' }
}

function firstStr(v: string | string[] | undefined): string | null {
	if (Array.isArray(v)) return v[0] ?? null
	return typeof v === 'string' ? v : null
}

export function encodeDownloadConfig(input: SavedDownloadInput): Record<string, string | undefined> {
	const q: Record<string, string> = {}
	if (input.kind === 'dataset') {
		q.k = 'dataset'
		q.s = input.slug
		if (input.columns.length > 0) q.c = joinEscaped(input.columns)
		if (input.sort) q.sort = encodeSort(input.sort)
		if (input.chain) q.chain = input.chain
		if (input.exclude) {
			const active = Object.entries(input.exclude)
				.filter(([, v]) => v)
				.map(([k]) => k)
			if (active.length > 0) q.excl = joinEscaped(active)
		}
		if (input.rowLimit && input.rowLimit > 0) q.rl = String(input.rowLimit)
		return q
	}
	if (input.kind === 'chart') {
		q.k = 'chart'
		q.s = input.slug
		if (input.params.length > 0) q.p = joinEscaped(input.params)
		if (input.paramLabels && input.paramLabels.length > 0) q.pl = joinEscaped(input.paramLabels)
		if (input.columns && input.columns.length > 0) q.c = joinEscaped(input.columns)
		if (input.sort) q.sort = encodeSort(input.sort)
		if (input.dateRange) q.dr = encodeDateRange(input.dateRange)
		if (input.categoryBreakdown) q.cb = input.categoryBreakdown.category
		return q
	}
	if (input.kind === 'query') {
		q.k = 'query'
		q.q = input.sql
		if (input.tables.length > 0) q.tbls = joinEscaped(input.tables.map(encodeTableRef))
		if (input.chartConfig) Object.assign(q, encodeChartConfig(input.chartConfig))
		return q
	}
	// multiMetric
	q.k = 'multi'
	q.pt = input.paramType
	q.pm = input.param
	if (input.paramLabel) q.plm = input.paramLabel
	if (input.metrics.length > 0) q.mt = joinEscaped(input.metrics)
	if (input.dateRange) q.dr = encodeDateRange(input.dateRange)
	return q
}

function encodeTableRef(ref: QueryTableRef): string {
	// Colons separate parts. Any raw colon in slug/param is escaped as \:
	const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:')
	if (ref.kind === 'dataset') return `d:${esc(ref.slug)}`
	return `c:${esc(ref.slug)}:${esc(ref.param)}`
}

function decodeTableRef(s: string): QueryTableRef | null {
	// Split on unescaped ':' only.
	const parts: string[] = []
	let buf = ''
	let i = 0
	while (i < s.length) {
		const ch = s[i]
		if (ch === '\\' && i + 1 < s.length) {
			buf += s[i + 1]
			i += 2
			continue
		}
		if (ch === ':') {
			parts.push(buf)
			buf = ''
			i += 1
			continue
		}
		buf += ch
		i += 1
	}
	parts.push(buf)
	const kind = parts[0]
	if (kind === 'd' && parts.length === 2 && parts[1]) {
		return { kind: 'dataset', slug: parts[1] }
	}
	if (kind === 'c' && parts.length === 3 && parts[1] && parts[2]) {
		return { kind: 'chart', slug: parts[1], param: parts[2] }
	}
	return null
}
export function decodeDownloadConfig(query: Record<string, string | string[] | undefined>): SavedDownloadInput | null {
	const kind = firstStr(query.k)
	if (!kind) return null

	if (kind === 'dataset') {
		const slug = firstStr(query.s)
		if (!slug) return null
		const columns = firstStr(query.c)
		const sort = firstStr(query.sort)
		const chain = firstStr(query.chain)
		const excl = firstStr(query.excl)
		const rl = firstStr(query.rl)
		const parsedSort = sort ? decodeSort(sort) : null
		const exclude =
			excl && excl.length > 0
				? splitEscaped(excl).reduce<Record<string, boolean>>((acc, key) => {
						acc[key] = true
						return acc
					}, {})
				: undefined
		const rowLimit = rl ? Number.parseInt(rl, 10) : undefined
		const config: DatasetInput = {
			kind: 'dataset',
			slug,
			columns: columns ? splitEscaped(columns) : [],
			...(parsedSort ? { sort: parsedSort } : {}),
			...(chain ? { chain } : {}),
			...(exclude ? { exclude } : {}),
			...(rowLimit && Number.isFinite(rowLimit) && rowLimit > 0 ? { rowLimit } : {})
		}
		return config
	}

	if (kind === 'chart') {
		const slug = firstStr(query.s)
		if (!slug) return null
		const p = firstStr(query.p)
		const pl = firstStr(query.pl)
		const c = firstStr(query.c)
		const sort = firstStr(query.sort)
		const dr = firstStr(query.dr)
		const cb = firstStr(query.cb)
		const parsedSort = sort ? decodeSort(sort) : null
		const dateRange = dr ? decodeDateRange(dr) : null
		const params = p ? splitEscaped(p) : []
		const paramLabels = pl ? splitEscaped(pl) : undefined
		const columns = c ? splitEscaped(c) : undefined
		const config: ChartInput = {
			kind: 'chart',
			slug,
			params,
			...(paramLabels && paramLabels.length === params.length ? { paramLabels } : {}),
			...(columns ? { columns } : {}),
			...(parsedSort ? { sort: parsedSort } : {}),
			...(dateRange ? { dateRange } : {}),
			...(cb ? { categoryBreakdown: { category: cb } } : {})
		}
		return config
	}

	if (kind === 'multi') {
		const pt = firstStr(query.pt)
		const pm = firstStr(query.pm)
		if (!pt || !pm) return null
		if (pt !== 'protocol' && pt !== 'chain') return null
		const paramType: SavedParamType = pt
		const plm = firstStr(query.plm)
		const mt = firstStr(query.mt)
		const dr = firstStr(query.dr)
		const dateRange = dr ? decodeDateRange(dr) : null
		const config: MultiMetricInput = {
			kind: 'multiMetric',
			paramType,
			param: pm,
			...(plm ? { paramLabel: plm } : {}),
			metrics: mt ? splitEscaped(mt) : [],
			...(dateRange ? { dateRange } : {})
		}
		return config
	}

	if (kind === 'query') {
		const sql = firstStr(query.q)
		if (!sql) return null
		const tbls = firstStr(query.tbls)
		const refs: QueryTableRef[] = []
		if (tbls) {
			for (const encoded of splitEscaped(tbls)) {
				const ref = decodeTableRef(encoded)
				if (ref) refs.push(ref)
			}
		}
		const chartConfig = decodeChartConfig(query)
		const config: QueryInput = { kind: 'query', sql, tables: refs, ...(chartConfig ? { chartConfig } : {}) }
		return config
	}

	return null
}

const CHART_TYPE_SHORT: Record<ChartType, string> = {
	line: 'ln',
	bar: 'ba',
	area: 'ar',
	areaStacked: 'as',
	areaPct: 'ap',
	hbar: 'hb',
	scatter: 'sc',
	bubble: 'bu',
	pie: 'pi',
	donut: 'do',
	treemap: 'tm',
	histogram: 'hi',
	candlestick: 'cs'
}
const CHART_TYPE_LONG: Record<string, ChartType> = Object.fromEntries(
	Object.entries(CHART_TYPE_SHORT).map(([k, v]) => [v, k as ChartType])
) as Record<string, ChartType>

const NUMBER_FORMAT_SHORT: Record<NumberFormat, string> = {
	auto: 'a',
	humanized: 'h',
	currency: 'c',
	percent: 'p'
}
const NUMBER_FORMAT_LONG: Record<string, NumberFormat> = Object.fromEntries(
	Object.entries(NUMBER_FORMAT_SHORT).map(([k, v]) => [v, k as NumberFormat])
) as Record<string, NumberFormat>

const STACK_SHORT: Record<StackMode, string> = { off: 'o', stacked: 's', expand: 'e' }
const STACK_LONG: Record<string, StackMode> = { o: 'off', s: 'stacked', e: 'expand' }

function encodeSeriesKinds(map: Record<string, 'line' | 'bar'>): string {
	return joinEscaped(Object.entries(map).map(([k, v]) => `${k}:${v === 'line' ? 'l' : 'b'}`))
}

function decodeSeriesKinds(s: string): Record<string, 'line' | 'bar'> {
	const out: Record<string, 'line' | 'bar'> = {}
	for (const entry of splitEscaped(s)) {
		const i = entry.lastIndexOf(':')
		if (i < 0) continue
		const name = entry.slice(0, i)
		const v = entry.slice(i + 1)
		if (v === 'l' || v === 'b') out[name] = v === 'l' ? 'line' : 'bar'
	}
	return out
}

function encodeSeriesColors(map: Record<string, string>): string {
	return joinEscaped(Object.entries(map).map(([k, v]) => `${k}:${v}`))
}

function decodeSeriesColors(s: string): Record<string, string> {
	const out: Record<string, string> = {}
	for (const entry of splitEscaped(s)) {
		const i = entry.lastIndexOf(':')
		if (i < 0) continue
		out[entry.slice(0, i)] = entry.slice(i + 1)
	}
	return out
}

function encodeChartConfig(cfg: ChartConfig): Record<string, string> {
	const q: Record<string, string> = {}
	q.cv = CHART_TYPE_SHORT[cfg.chartType]
	if (cfg.xCol) q.cx = cfg.xCol
	if (cfg.yCols.length > 0) q.cy = joinEscaped(cfg.yCols.slice(0, 8))
	if (cfg.splitByCol) q.csb = cfg.splitByCol
	if (cfg.stackMode !== 'off') q.cs = STACK_SHORT[cfg.stackMode]
	if (cfg.rightAxisCols.length > 0) q.cra = joinEscaped(cfg.rightAxisCols)
	if (Object.keys(cfg.seriesKinds).length > 0) q.ckn = encodeSeriesKinds(cfg.seriesKinds)
	if (Object.keys(cfg.seriesColors).length > 0) q.ccl = encodeSeriesColors(cfg.seriesColors)
	if (cfg.numberFormat !== 'auto') q.cn = NUMBER_FORMAT_SHORT[cfg.numberFormat]
	const extras: Record<string, unknown> = {}
	if (cfg.candlestick) extras.candlestick = cfg.candlestick
	if (cfg.bubble) extras.bubble = cfg.bubble
	if (cfg.histogram) extras.histogram = cfg.histogram
	if (Object.keys(extras).length > 0) q.cjs = JSON.stringify(extras)
	return q
}

function decodeChartConfig(query: Record<string, string | string[] | undefined>): ChartConfig | undefined {
	const cv = firstStr(query.cv)
	if (!cv) return undefined
	const chartType = CHART_TYPE_LONG[cv]
	if (!chartType) return undefined
	const cy = firstStr(query.cy)
	const yCols = cy ? splitEscaped(cy).slice(0, 8) : []
	const cra = firstStr(query.cra)
	const ckn = firstStr(query.ckn)
	const ccl = firstStr(query.ccl)
	const cn = firstStr(query.cn)
	const cs = firstStr(query.cs)
	const extrasRaw = firstStr(query.cjs)
	let extras: Record<string, any> = {}
	if (extrasRaw) {
		try {
			extras = JSON.parse(extrasRaw)
		} catch {
			extras = {}
		}
	}

	const cfg: ChartConfig = {
		chartType,
		xCol: firstStr(query.cx),
		yCols,
		splitByCol: firstStr(query.csb),
		stackMode: cs ? STACK_LONG[cs] ?? 'off' : 'off',
		rightAxisCols: cra ? splitEscaped(cra) : [],
		seriesKinds: ckn ? decodeSeriesKinds(ckn) : {},
		seriesColors: ccl ? decodeSeriesColors(ccl) : {},
		numberFormat: cn ? NUMBER_FORMAT_LONG[cn] ?? 'auto' : 'auto',
		candlestick: extras.candlestick,
		bubble: extras.bubble,
		histogram: extras.histogram
	}
	return cfg
}

export function buildShareUrl(origin: string, pathname: string, input: SavedDownloadInput): string {
	const params = new URLSearchParams(encodeDownloadConfig(input))
	const qs = params.toString()
	return qs ? `${origin}${pathname}?${qs}` : `${origin}${pathname}`
}
