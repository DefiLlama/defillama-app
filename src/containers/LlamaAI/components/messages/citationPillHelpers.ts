import { getToolLabel } from '~/containers/LlamaAI/toolMetadata'
import type { UnifiedCitationReference } from '~/containers/LlamaAI/types'

export const PRIVACY_SENTINEL = '[value omitted — sensitive]'

const BADGE: Record<string, string> = {
	data: 'DefiLlama',
	computed: 'Calculated',
	web: 'Web',
	x: 'X',
	file: 'File',
	tool: 'Tool'
}

export function badgeFor(sourceType?: string): string {
	if (!sourceType) return 'Source'
	return BADGE[sourceType] ?? 'Source'
}

export function iconFor(sourceType?: string): 'layers' | 'earth' | 'sparkles' | 'file-text' | 'twitter' | 'code' {
	if (sourceType === 'x') return 'twitter'
	if (sourceType === 'web') return 'earth'
	if (sourceType === 'file') return 'file-text'
	if (sourceType === 'computed') return 'code'
	if (sourceType === 'data') return 'layers'
	return 'sparkles'
}

const ACCENT: Record<string, string> = {
	data: '#1f67d2',
	computed: '#7c5cff',
	web: '#0ea5a4',
	x: '#1d9bf0',
	tool: '#d97706',
	file: '#16a34a'
}

export function accentFor(sourceType?: string): string {
	return (sourceType && ACCENT[sourceType]) || '#1f67d2'
}

export function shouldFlagMismatch(v: UnifiedCitationReference['verification']): boolean {
	return !!v && v.claimType === 'quantitative' && v.valueMatch === 'mismatch'
}

export function shouldFlagUnverified(v: UnifiedCitationReference['verification']): boolean {
	return !!v && v.claimType === 'quantitative' && v.valueMatch === 'unverified'
}

export function unverifiedLabel(): string {
	return "Couldn't verify this figure against the source data"
}

export function defaultTierVisible(advancedProvenance: boolean): boolean {
	return advancedProvenance
}

export function mismatchLabel(reference: UnifiedCitationReference): string {
	const shown = reference.value ? ` — source shows a different value than “${reference.value}”` : ''
	return `Couldn't confirm this figure${shown}`
}

export function expandLabel(sourceType?: string): string {
	if (sourceType === 'computed') return 'How this was calculated'
	return 'See the data'
}

export function hiddenRowsLabel(rowCount?: number): string | null {
	if (typeof rowCount !== 'number' || rowCount <= 0) return null
	return `Rows hidden — ${rowCount} total`
}

function trimToSigDecimals(n: number): string {
	if (Number.isInteger(n)) return n.toLocaleString('en-US')
	const abs = Math.abs(n)
	const decimals = abs >= 100 ? 0 : abs >= 1 ? 2 : 4
	const rounded = Number(n.toFixed(decimals))
	if (Number.isInteger(rounded)) return rounded.toLocaleString('en-US')
	return rounded.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function formatCellValue(v: unknown): string {
	if (v == null) return '—'
	if (typeof v === 'boolean') return String(v)
	if (typeof v === 'number') {
		if (!Number.isFinite(v)) return String(v)
		return trimToSigDecimals(v)
	}
	if (typeof v === 'string') {
		const trimmed = v.trim()
		if (trimmed === '') return '—'
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			const n = Number(trimmed)
			if (Number.isFinite(n)) return trimToSigDecimals(n)
		}
		return v
	}
	return String(v)
}

const UNIT: Record<string, number> = { t: 1e12, b: 1e9, m: 1e6, k: 1e3, bn: 1e9, '': 1 }

export function parseRefNumber(str: unknown): number | null {
	if (typeof str === 'number') return Number.isFinite(str) ? str : null
	if (typeof str !== 'string') return null
	const m = str.replace(/,/g, '').match(/(-?\d*\.?\d+)(?:e([+-]?\d+))?\s*([a-zA-Z]*)/i)
	if (!m) return null
	const exp = m[2] ? parseInt(m[2], 10) : 0
	const suffix = (m[3] || '').toLowerCase()
	const mult = UNIT[suffix] ?? 1
	const num = parseFloat(m[1]) * Math.pow(10, exp) * mult
	return Number.isFinite(num) ? num : null
}

export interface CitedCellRef {
	field?: string
	rowIndex?: number
	value?: string
}

export interface CitedCell {
	rowIndex: number
	column: string
}

export function findCitedCell(
	rows: Array<Record<string, unknown>> | undefined,
	columns: string[] | undefined,
	ref: CitedCellRef
): CitedCell | null {
	if (!rows || rows.length === 0) return null
	const cols = columns && columns.length > 0 ? columns : Object.keys(rows[0])
	if (
		typeof ref.rowIndex === 'number' &&
		ref.rowIndex >= 0 &&
		ref.rowIndex < rows.length &&
		ref.field &&
		cols.includes(ref.field)
	) {
		return { rowIndex: ref.rowIndex, column: ref.field }
	}
	const target = parseRefNumber(ref.value)
	if (target == null) return null
	const tolerance = Math.max(Math.abs(target) * 1e-3, 1e-9)
	for (let ri = 0; ri < rows.length; ri++) {
		for (const col of cols) {
			const cell = parseRefNumber(rows[ri][col] as unknown)
			if (cell == null) continue
			if (Math.abs(cell - target) <= tolerance) return { rowIndex: ri, column: col }
		}
	}
	return null
}

const DATE_COLS = ['date', 'day', 'period', 'ts', 'ts_close', 'snapshot_date', 'dt', 'as_of', 'asof']

export function formatDateValue(v: unknown): string | null {
	if (v == null) return null
	let d: Date | null = null
	if (typeof v === 'number' && Number.isFinite(v)) {
		d = new Date(v < 1e12 ? v * 1000 : v)
	} else if (typeof v === 'string') {
		const s = v.trim()
		if (s === '') return null
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
		if (m) {
			d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
		} else {
			const parsed = Date.parse(s)
			if (!Number.isNaN(parsed)) d = new Date(parsed)
		}
	}
	if (!d || Number.isNaN(d.getTime())) return null
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function citedRowDate(row: Record<string, unknown> | undefined, cols: string[]): string | null {
	if (!row) return null
	for (const c of DATE_COLS) {
		if (cols.includes(c) || c in row) {
			const formatted = formatDateValue(row[c])
			if (formatted) return formatted
		}
	}
	return null
}

export function humanizeColumn(name: string): string {
	const spaced = name.replace(/_/g, ' ').trim()
	if (spaced === '') return name
	return spaced.replace(/\b\w/g, (c) => c.toUpperCase())
}

const METRIC_EXACT: Record<string, string> = {
	pf_ratio: 'P/F ratio (price ÷ annual fees)',
	ps_ratio: 'P/S ratio (price ÷ annual revenue)',
	price: 'price',
	mcap: 'market cap',
	fdv: 'fully diluted valuation',
	fdv_outstanding: 'FDV (outstanding supply)',
	price_ath: 'all-time-high price',
	price_ath_ts: 'all-time-high date',
	pct_from_ath: 'change from all-time high',
	protocol_count: 'number of protocols',
	chain_count: 'number of chains',
	tvl: 'total value locked',
	tvl_usd: 'total value locked',
	tvl_base_from_bridge: 'bridged value (in TVL)',
	tvl_base_inclusive_bridge_tvl: 'total value locked (incl. bridged)',
	apy: 'APY',
	apy_base: 'base APY',
	apy_base_7d: 'base APY (7-day avg)',
	apy_base_borrow: 'base borrow APY',
	apy_reward: 'reward APY',
	apy_avg_30d: 'average APY (30 days)',
	apy_median_30d: 'median APY (30 days)',
	apy_std_30d: 'APY volatility (30-day std dev)',
	cv_30d: 'APY volatility (30 days)',
	impermanent_loss_7d: 'impermanent loss (7 days)',
	total_borrow: 'total borrowed',
	total_supply: 'total supplied',
	debt_ceiling: 'debt ceiling',
	close: 'closing price',
	high: 'high price',
	low: 'low price',
	volume: 'trading volume',
	token_volume: 'token trading volume',
	holder_count: 'number of holders',
	top10_pct: 'top-10 holder concentration'
}

const METRIC_BASE: Record<string, string> = {
	tvl: 'total value locked',
	tvl_base: 'total value locked',
	tvl_borrowed: 'borrowed value',
	tvl_staking: 'staked value',
	tvl_pool2: 'POOL2 (LP/farming) value',
	tvl_vesting: 'vesting value',
	tvl_treasury: 'treasury value',
	tvl_dc_only: 'TVL (double-counted only)',
	tvl_ls_only: 'TVL (liquid staking only)',
	tvl_ls_and_dc: 'TVL (liquid staking + double-counted)',
	fees: 'fees',
	revenue: 'revenue',
	holder_revenue: 'holder revenue',
	incentive: 'incentives',
	app_fees: 'app fees',
	app_revenue: 'app revenue',
	chain_fees: 'chain fees',
	chain_revenue: 'chain revenue',
	chain_rev: 'chain revenue',
	chain_holder_revenue: 'chain holder revenue',
	chain_mev: 'chain MEV',
	volume_dexs: 'DEX volume',
	volume_derivatives: 'derivatives (perps) volume',
	volume_aggr_derivatives: 'derivatives aggregator volume',
	volume_aggregators: 'DEX aggregator volume',
	volume_options: 'options premium volume',
	volume_options_notional: 'options notional volume',
	token_volume: 'token trading volume',
	mcap: 'market cap',
	fdv: 'fully diluted valuation',
	fdv_outstanding: 'FDV (outstanding supply)',
	price: 'price'
}

const METRIC_WINDOW: Record<string, string> = {
	'1d': '24h',
	'7d': '7 days',
	'30d': '30 days',
	'90d': '90 days',
	'180d': '180 days',
	'365d': '1 year',
	ytd: 'year-to-date',
	alltime: 'all-time',
	annualised: 'annualized',
	annualized: 'annualized'
}

const WINDOW_TOKENS = Object.keys(METRIC_WINDOW)

interface ParsedMetric {
	base: string
	isChange: boolean
	window: string | null
}

function parseMetricField(field: string): ParsedMetric {
	let f = field
	let isChange = false
	if (f.endsWith('_pct_change')) {
		isChange = true
		f = f.slice(0, -'_pct_change'.length)
	} else if (f.endsWith('_pct')) {
		isChange = true
		f = f.slice(0, -'_pct'.length)
	} else if (f.endsWith('_growth')) {
		isChange = true
		f = f.slice(0, -'_growth'.length)
	}
	let window: string | null = null
	for (const tok of WINDOW_TOKENS) {
		if (f.endsWith('_' + tok)) {
			window = tok
			f = f.slice(0, -(tok.length + 1))
			break
		}
	}
	return { base: f, isChange, window }
}

export function metricLabel(field: string): string {
	if (METRIC_EXACT[field]) return METRIC_EXACT[field]
	const { base: f, isChange, window } = parseMetricField(field)
	const base = METRIC_BASE[f] ?? humanizeColumn(f)
	if (isChange) return window ? `${base} change (${METRIC_WINDOW[window]})` : `${base} change`
	if (window) return `${base} (${METRIC_WINDOW[window]})`
	return base
}

const USD_BASES = new Set([
	'price',
	'close',
	'high',
	'low',
	'mcap',
	'fdv',
	'fdv_outstanding',
	'price_ath',
	'tvl',
	'tvl_base',
	'tvl_borrowed',
	'tvl_staking',
	'tvl_pool2',
	'tvl_vesting',
	'tvl_treasury',
	'tvl_dc_only',
	'tvl_ls_only',
	'tvl_ls_and_dc',
	'tvl_usd',
	'tvl_base_from_bridge',
	'tvl_base_inclusive_bridge_tvl',
	'fees',
	'revenue',
	'holder_revenue',
	'incentive',
	'app_fees',
	'app_revenue',
	'chain_fees',
	'chain_revenue',
	'chain_rev',
	'chain_holder_revenue',
	'chain_mev',
	'volume',
	'volume_dexs',
	'volume_derivatives',
	'volume_aggr_derivatives',
	'volume_aggregators',
	'volume_options',
	'volume_options_notional',
	'token_volume',
	'total_borrow',
	'total_supply',
	'debt_ceiling'
])

const PERCENT_ALREADY = new Set(['pct_from_ath', 'top10_pct'])
const COUNT_FIELDS = new Set(['protocol_count', 'chain_count', 'holder_count'])

type MetricKind = 'date' | 'usd' | 'percent' | 'percent-decimal' | 'count' | 'ratio' | 'plain'

function metricKind(field: string): MetricKind {
	if (DATE_COLS.includes(field) || field.endsWith('_ts') || field.endsWith('_date')) return 'date'
	if (field.startsWith('apy')) return 'percent'
	if (PERCENT_ALREADY.has(field)) return 'percent'
	const { base, isChange } = parseMetricField(field)
	if (isChange) return 'percent-decimal'
	if (field.endsWith('_count') || COUNT_FIELDS.has(field)) return 'count'
	if (field.endsWith('_ratio')) return 'ratio'
	if (USD_BASES.has(base)) return 'usd'
	return 'plain'
}

function formatUsd(n: number): string {
	const sign = n < 0 ? '-' : ''
	const abs = Math.abs(n)
	if (abs >= 1e12) return `${sign}$${trimToSigDecimals(abs / 1e12)}T`
	if (abs >= 1e9) return `${sign}$${trimToSigDecimals(abs / 1e9)}B`
	if (abs >= 1e6) return `${sign}$${trimToSigDecimals(abs / 1e6)}M`
	const decimals = abs >= 100 ? 0 : 2
	return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: decimals })}`
}

function formatPercent(n: number): string {
	const decimals = Math.abs(n) >= 100 ? 0 : 2
	return `${n.toLocaleString('en-US', { maximumFractionDigits: decimals })}%`
}

export function formatMetricValue(field: string, value: unknown): string {
	const kind = metricKind(field)
	if (kind === 'date') return formatDateValue(value) ?? formatCellValue(value)
	const n = parseRefNumber(value)
	if (n == null) return formatCellValue(value)
	switch (kind) {
		case 'usd':
			return formatUsd(n)
		case 'percent':
			return formatPercent(n)
		case 'percent-decimal':
			return formatPercent(n * 100)
		case 'count':
			return Math.round(n).toLocaleString('en-US')
		case 'ratio':
			return `${trimToSigDecimals(n)}×`
		default:
			return formatCellValue(value)
	}
}

const ENTITY_COLUMNS = ['name', 'symbol', 'protocol', 'sub_protocol', 'chain', 'category', 'token_nk']

export function describeFigure(reference: UnifiedCitationReference, citedCell: CitedCell | null): string | null {
	const field = citedCell?.column ?? reference.field
	if (!field) return null
	const metric = metricLabel(field)
	const row = citedCell && reference.rows ? reference.rows[citedCell.rowIndex] : undefined
	let entity: string | undefined
	if (row) {
		for (const col of ENTITY_COLUMNS) {
			const v = row[col]
			if (typeof v === 'string' && v.trim() && parseRefNumber(v) == null) {
				entity = v.replace(/^coingecko:/, '').replace(/[-_]/g, ' ')
				entity = entity.replace(/\b\w/g, (c) => c.toUpperCase())
				break
			}
		}
	}
	return entity ? `${entity} · ${metric}` : metric
}

const BARE_URL_RE = /https?:\/\/\S+$/i

export function sanitizeExcerpt(text: unknown, maxLength = 200): string {
	if (typeof text !== 'string') return ''
	let out = text.replace(/\s+/g, ' ').trim()
	while (/^\[[^\]]*\]\s*/.test(out)) {
		out = out.replace(/^\[[^\]]*\]\s*/, '').trim()
	}
	out = out.replace(BARE_URL_RE, '').trim()
	if (out.length > maxLength) {
		out =
			out
				.slice(0, maxLength)
				.replace(/\s+\S*$/, '')
				.trim() + '…'
	}
	return out
}

export function domainFromUrl(url: unknown): string | null {
	if (typeof url !== 'string' || url.trim() === '') return null
	try {
		const host = new URL(url).hostname
		return host.replace(/^www\./, '') || null
	} catch {
		const m = url.match(/^(?:https?:\/\/)?([^/?#\s]+)/i)
		if (!m) return null
		return m[1].replace(/^www\./, '') || null
	}
}

export function xHandleLabel(label: unknown): string | null {
	if (typeof label !== 'string') return null
	const stripped = label.trim().replace(/^@+/, '')
	if (stripped === '') return null
	return `@${stripped}`
}

export function friendlyToolName(reference: UnifiedCitationReference): string {
	if (reference.label && reference.label.trim() !== '') return reference.label
	if (reference.toolName && reference.toolName.trim() !== '') return getToolLabel(reference.toolName)
	return 'Tool'
}

export function isPrivacySentinel(text: unknown): boolean {
	return typeof text === 'string' && text.trim() === PRIVACY_SENTINEL
}

export interface ToolArgRow {
	key: string
	value: string
}

export function toolArgRows(args: Record<string, unknown> | undefined): ToolArgRow[] {
	if (!args || typeof args !== 'object') return []
	return Object.entries(args)
		.filter(([, v]) => v != null && v !== '')
		.map(([k, v]) => ({ key: humanizeColumn(k), value: formatArgValue(v) }))
}

function formatArgValue(v: unknown): string {
	if (typeof v === 'string') return v
	if (typeof v === 'number') return formatCellValue(v)
	if (typeof v === 'boolean') return String(v)
	if (Array.isArray(v)) return v.map((x) => formatArgValue(x)).join(', ')
	try {
		return JSON.stringify(v)
	} catch {
		return String(v)
	}
}

export function formatOutputValue(key: string, value: unknown): string {
	if (/_date$|_ts$|^date$/.test(key)) return formatDateValue(value) ?? formatCellValue(value)
	if (/_pct$|_rate$|_share$/.test(key)) {
		const n = parseRefNumber(value)
		return n != null ? `${formatCellValue(n)}%` : formatCellValue(value)
	}
	return formatCellValue(value)
}

export function computedSummaryLabel(reference: UnifiedCitationReference): string | null {
	const count = reference.sources?.length ?? 0
	if (count <= 0) return null
	return `Calculated from ${count} source${count === 1 ? '' : 's'}`
}
