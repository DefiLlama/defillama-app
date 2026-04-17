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

export function encodeDownloadConfig(input: SavedDownloadInput): Record<string, string> {
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
		const config: QueryInput = { kind: 'query', sql, tables: refs }
		return config
	}

	return null
}

export function buildShareUrl(origin: string, pathname: string, input: SavedDownloadInput): string {
	const params = new URLSearchParams(encodeDownloadConfig(input))
	const qs = params.toString()
	return qs ? `${origin}${pathname}?${qs}` : `${origin}${pathname}`
}
