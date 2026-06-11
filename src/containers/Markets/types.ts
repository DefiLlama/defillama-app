/**
 * Markets feature — types + normalization layer.
 *
 * This is the ONLY place that touches raw markets-server cache field names. Everything
 * downstream (utils, components, page) consumes the clean internal types defined here.
 * If the live cache files use slightly different field names than assumed below, fix the
 * `normalize*` functions here and nothing else needs to change.
 *
 * Cache vocabulary (per spec): segment keys are `spot` / `linear_perp` / `inverse_perp`,
 * the category field is `category`, volumes are `volume_24h` / `volume_prev_24h`, every file
 * carries `last_updated`. The normalizers also accept the ui-tool aliases (`tag`,
 * `volume_24h_usd`, `oi_prev`, `volume_usd`) so the same code works against either source.
 */

export type Segment = 'spot' | 'linear_perp' | 'inverse_perp'

export const SEGMENTS: ReadonlyArray<{ id: Segment; label: string; hasOi: boolean }> = [
	{ id: 'spot', label: 'Spot', hasOi: false },
	{ id: 'linear_perp', label: 'Linear Perp', hasOi: true },
	{ id: 'inverse_perp', label: 'Inverse Perp', hasOi: true }
]

export const SEGMENT_IDS: ReadonlyArray<Segment> = SEGMENTS.map((s) => s.id)

export function isSegment(value: unknown): value is Segment {
	return value === 'spot' || value === 'linear_perp' || value === 'inverse_perp'
}

export function segmentHasOi(segment: Segment): boolean {
	return segment !== 'spot'
}

/** Pick the requested segment if it has data, else the first available one. */
export function resolveSegment(requested: Segment, available: ReadonlyArray<Segment>): Segment {
	return available.includes(requested) ? requested : (available[0] ?? requested)
}

// ---------------------------------------------------------------------------
// Clean internal types
// ---------------------------------------------------------------------------

/** One base symbol, merged across every exchange in a segment. */
export interface SymbolStat {
	base: string
	tags: string[]
	price: number | null
	/** fraction, e.g. 0.05 => +5% */
	price_change_24h: number | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	funding_avg_8h: number | null
	leverage_min: number | null
	leverage_max: number | null
	market_count: number
	exchange_count: number
}

/** One category, merged across its tokens in a segment. */
export interface CategoryStat {
	tag: string
	/** volume-weighted mean of the category's token price changes */
	price_change_24h: number | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	/** volume-weighted across the category's tokens */
	funding_avg_8h: number | null
	leverage_min: number | null
	leverage_max: number | null
	token_count: number
	market_count: number
}

/** One venue's merged totals for a segment (homepage exchanges table). */
export interface ExchangeListRow {
	exchange: string
	exchange_type: 'cex' | 'dex'
	defillama_slug: string | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	market_count: number
}

/** Daily 30d point for the by-exchange charts. `day` is unix milliseconds. */
export interface ExchangeSeriesRow {
	day: number
	exchange: string
	exchange_type: 'cex' | 'dex'
	segment: Segment
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

/** Daily 30d point for the by-category charts. `day` is unix milliseconds. */
export interface CategorySeriesRow {
	day: number
	segment: Segment
	tag: string
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

/** Daily 30d point for a single trading pair (category page by-pair charts). */
export interface PairSeriesRow {
	day: number
	segment: Segment
	pair: string
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

export type SymbolStatsBySegment = Partial<Record<Segment, SymbolStat[]>>
export type CategoryStatsBySegment = Partial<Record<Segment, CategoryStat[]>>

export interface CategoryPageData {
	tag: string
	last_updated: string | null
	summaries: Partial<Record<Segment, CategoryStat>>
	tokens: SymbolStatsBySegment
	seriesByExchange: ExchangeSeriesRow[]
	seriesByPair: PairSeriesRow[]
	series: CategorySeriesRow[]
}

// ---------------------------------------------------------------------------
// Raw cache shapes (permissive — names may drift, normalizers tolerate aliases)
// ---------------------------------------------------------------------------

type RawSegmentStat = Record<string, unknown>

interface RawTokenEntry {
	symbol?: string
	base?: string
	tags?: unknown
	segments?: Record<string, RawSegmentStat>
}

export interface RawTokensList {
	last_updated?: string
	tokens?: RawTokenEntry[]
}

interface RawCategoryEntry {
	category?: string
	tag?: string
	segments?: Record<string, RawSegmentStat>
}

export interface RawCategoriesList {
	last_updated?: string
	categories?: RawCategoryEntry[]
	// alternate shape: keyed directly by segment
	spot?: RawCategoryEntry[]
	linear_perp?: RawCategoryEntry[]
	inverse_perp?: RawCategoryEntry[]
}

export interface RawSeriesEnvelope {
	last_updated?: string
	series?: Record<string, unknown>[]
	byExchange?: Record<string, unknown>[]
	byCategory?: Record<string, unknown>[]
}

export interface RawCategoryPage {
	category?: string
	tag?: string
	last_updated?: string
	segments?: Record<string, RawSegmentStat>
	summary?: Record<string, RawSegmentStat>
	tokens?: Record<string, RawTokenEntry[]> | RawTokenEntry[]
	series?: Record<string, unknown>[]
	series_by_exchange?: Record<string, unknown>[]
	seriesByExchange?: Record<string, unknown>[]
	series_by_pair?: Record<string, unknown>[]
	seriesByPair?: Record<string, unknown>[]
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function toNum(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value)
		return Number.isFinite(n) ? n : null
	}
	return null
}

/** First key whose value is a finite number. */
function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
	for (const key of keys) {
		const n = toNum(obj[key])
		if (n != null) return n
	}
	return null
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/** Normalize a day field (unix seconds, unix ms, or ISO string) to unix milliseconds. */
function dayToMs(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		// < 1e12 => seconds, otherwise already ms
		return value < 1e12 ? value * 1000 : value
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const asNum = Number(value)
		if (Number.isFinite(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum
		const parsed = Date.parse(value)
		return Number.isFinite(parsed) ? parsed : null
	}
	return null
}

function normalizeSegmentKey(value: unknown): Segment | null {
	if (isSegment(value)) return value
	// tolerate ui-tool aliases
	if (value === 'linear') return 'linear_perp'
	if (value === 'inverse') return 'inverse_perp'
	return null
}

function normalizeExchangeType(value: unknown): 'cex' | 'dex' {
	return value === 'dex' ? 'dex' : 'cex'
}

/** Derive a segment from market_type/contract_type when no explicit segment is present. */
function segmentFromMarketType(marketType: unknown, contractType: unknown): Segment | null {
	if (marketType === 'spot') return 'spot'
	if (marketType === 'perpetual') {
		if (contractType === 'linear') return 'linear_perp'
		if (contractType === 'inverse') return 'inverse_perp'
	}
	return null
}

// ---------------------------------------------------------------------------
// Stat normalizers
// ---------------------------------------------------------------------------

function normalizeSymbolStat(base: string, tags: string[], raw: RawSegmentStat): SymbolStat {
	return {
		base,
		tags,
		price: pickNum(raw, 'price', 'close'),
		price_change_24h: pickNum(raw, 'price_change_24h'),
		volume_24h_usd: pickNum(raw, 'volume_24h', 'volume_24h_usd') ?? 0,
		volume_prev_24h_usd: pickNum(raw, 'volume_prev_24h', 'volume_prev_24h_usd'),
		oi_usd: pickNum(raw, 'oi_usd', 'total_oi_usd'),
		oi_prev_usd: pickNum(raw, 'oi_prev_usd', 'oi_prev'),
		funding_avg_8h: pickNum(raw, 'funding_avg_8h', 'funding_rate_8h'),
		leverage_min: pickNum(raw, 'leverage_min'),
		leverage_max: pickNum(raw, 'leverage_max', 'max_leverage'),
		market_count: pickNum(raw, 'market_count') ?? 0,
		exchange_count: pickNum(raw, 'exchange_count') ?? 0
	}
}

function normalizeCategoryStat(tag: string, raw: RawSegmentStat): CategoryStat {
	return {
		tag,
		price_change_24h: pickNum(raw, 'price_change_24h'),
		volume_24h_usd: pickNum(raw, 'volume_24h', 'volume_24h_usd') ?? 0,
		volume_prev_24h_usd: pickNum(raw, 'volume_prev_24h', 'volume_prev_24h_usd'),
		oi_usd: pickNum(raw, 'oi_usd', 'total_oi_usd'),
		oi_prev_usd: pickNum(raw, 'oi_prev_usd', 'oi_prev'),
		funding_avg_8h: pickNum(raw, 'funding_rate_8h', 'funding_avg_8h'),
		leverage_min: pickNum(raw, 'leverage_min'),
		leverage_max: pickNum(raw, 'leverage_max', 'max_leverage'),
		token_count: pickNum(raw, 'token_count') ?? 0,
		market_count: pickNum(raw, 'market_count') ?? 0
	}
}

// ---------------------------------------------------------------------------
// Public normalizers (raw cache file -> clean internal data)
// ---------------------------------------------------------------------------

/** tokens/list.json -> per-segment arrays of merged symbol stats. */
export function normalizeTokensList(raw: RawTokensList | null | undefined): SymbolStatsBySegment {
	const out: SymbolStatsBySegment = {}
	for (const entry of raw?.tokens ?? []) {
		const base = (entry.base ?? entry.symbol ?? '').toString()
		if (!base) continue
		const tags = toStringArray(entry.tags)
		const segments = entry.segments ?? {}
		for (const [rawKey, stat] of Object.entries(segments)) {
			const seg = normalizeSegmentKey(rawKey)
			if (!seg || !stat) continue
			;(out[seg] ??= []).push(normalizeSymbolStat(base, tags, stat))
		}
	}
	return out
}

/** categories/list.json -> per-segment arrays of merged category stats. */
export function normalizeCategoriesList(raw: RawCategoriesList | null | undefined): CategoryStatsBySegment {
	const out: CategoryStatsBySegment = {}
	if (!raw) return out

	// Shape A: { categories: [{ category, segments: { spot, linear_perp, ... } }] }
	if (Array.isArray(raw.categories)) {
		for (const entry of raw.categories) {
			const tag = (entry.category ?? entry.tag ?? '').toString()
			if (!tag) continue
			for (const [rawKey, stat] of Object.entries(entry.segments ?? {})) {
				const seg = normalizeSegmentKey(rawKey)
				if (!seg || !stat) continue
				;(out[seg] ??= []).push(normalizeCategoryStat(tag, stat))
			}
		}
		return out
	}

	// Shape B: { spot: [{ category, ... }], linear_perp: [...], inverse_perp: [...] }
	for (const seg of SEGMENT_IDS) {
		const list = raw[seg]
		if (!Array.isArray(list)) continue
		for (const entry of list) {
			const tag = (entry.category ?? entry.tag ?? '').toString()
			if (!tag) continue
			out[seg] = out[seg] ?? []
			out[seg]!.push(normalizeCategoryStat(tag, entry as RawSegmentStat))
		}
	}
	return out
}

interface RawExchangeListEntry {
	exchange?: string
	defillama_slug?: string | null
	market_count?: number
	total_volume_24h?: number | null
	total_volume_prev_24h?: number | null
	total_oi_usd?: number | null
	total_oi_prev_usd?: number | null
}

export interface RawExchangesList {
	last_updated?: string
	cex?: Record<string, RawExchangeListEntry[]>
	dex?: Record<string, RawExchangeListEntry[]>
}

/** exchanges/list.json -> per-segment arrays of venue rows (cex + dex merged). */
export function normalizeExchangesList(
	raw: RawExchangesList | null | undefined
): Partial<Record<Segment, ExchangeListRow[]>> {
	const out: Partial<Record<Segment, ExchangeListRow[]>> = {}
	for (const venueType of ['cex', 'dex'] as const) {
		const bySegment = raw?.[venueType]
		if (!bySegment) continue
		for (const [rawKey, entries] of Object.entries(bySegment)) {
			const seg = normalizeSegmentKey(rawKey)
			if (!seg || !Array.isArray(entries)) continue
			for (const entry of entries) {
				const exchange = (entry.exchange ?? '').toString()
				if (!exchange) continue
				const rawEntry = entry as Record<string, unknown>
				;(out[seg] ??= []).push({
					exchange,
					exchange_type: venueType,
					defillama_slug: entry.defillama_slug ?? null,
					volume_24h_usd: pickNum(rawEntry, 'total_volume_24h', 'volume_24h') ?? 0,
					volume_prev_24h_usd: pickNum(rawEntry, 'total_volume_prev_24h', 'volume_prev_24h'),
					oi_usd: pickNum(rawEntry, 'total_oi_usd', 'oi_usd'),
					oi_prev_usd: pickNum(rawEntry, 'total_oi_prev_usd', 'oi_prev_usd'),
					market_count: pickNum(rawEntry, 'market_count') ?? 0
				})
			}
		}
	}
	return out
}

/** exchanges/series.json -> flat daily rows (day in ms). */
export function normalizeExchangeSeries(raw: RawSeriesEnvelope | null | undefined): ExchangeSeriesRow[] {
	const rows = raw?.series ?? raw?.byExchange ?? []
	const out: ExchangeSeriesRow[] = []
	for (const r of rows) {
		const day = dayToMs(r.day ?? r.date ?? r.ts)
		const exchange = (r.exchange ?? r.name ?? '').toString()
		const segment = normalizeSegmentKey(r.segment) ?? segmentFromMarketType(r.market_type, r.contract_type)
		if (day == null || !exchange || !segment) continue
		out.push({
			day,
			exchange,
			exchange_type: normalizeExchangeType(r.exchange_type),
			segment,
			volume_usd: pickNum(r, 'volume_usd', 'volume_24h', 'volume') ?? 0,
			oi_usd: pickNum(r, 'oi_usd', 'oi'),
			market_count: pickNum(r, 'market_count') ?? 0
		})
	}
	return out
}

/**
 * categories/series.json -> flat daily rows (day in ms).
 * `defaultTag` tags rows that omit the category (the per-category page's own `series`, where the
 * category is implied by the file rather than repeated on every row).
 */
export function normalizeCategorySeries(
	raw: RawSeriesEnvelope | null | undefined,
	defaultTag = ''
): CategorySeriesRow[] {
	const rows = raw?.series ?? raw?.byCategory ?? []
	const out: CategorySeriesRow[] = []
	for (const r of rows) {
		const day = dayToMs(r.day ?? r.date ?? r.ts)
		const tag = (r.category ?? r.tag ?? defaultTag).toString()
		const segment = normalizeSegmentKey(r.segment)
		if (day == null || !tag || !segment) continue
		out.push({
			day,
			segment,
			tag,
			volume_usd: pickNum(r, 'volume_usd', 'volume_24h', 'volume') ?? 0,
			oi_usd: pickNum(r, 'oi_usd', 'oi'),
			market_count: pickNum(r, 'market_count') ?? 0
		})
	}
	return out
}

/** categories/<category>.json series_by_pair -> flat daily per-pair rows (day in ms). */
export function normalizeCategoryPairSeries(raw: Record<string, unknown>[] | null | undefined): PairSeriesRow[] {
	const out: PairSeriesRow[] = []
	for (const r of raw ?? []) {
		const day = dayToMs(r.day ?? r.date ?? r.ts)
		const pair = (r.pair ?? r.symbol ?? '').toString()
		const segment = normalizeSegmentKey(r.segment)
		if (day == null || !pair || !segment) continue
		out.push({
			day,
			segment,
			pair,
			volume_usd: pickNum(r, 'volume_usd', 'volume_24h', 'volume') ?? 0,
			oi_usd: pickNum(r, 'oi_usd', 'oi'),
			market_count: pickNum(r, 'market_count') ?? 0
		})
	}
	return out
}

/** categories/<category>.json -> everything the category page needs. */
export function normalizeCategoryPage(raw: RawCategoryPage | null | undefined, fallbackTag: string): CategoryPageData {
	const tag = (raw?.category ?? raw?.tag ?? fallbackTag).toString()
	const summaries: Partial<Record<Segment, CategoryStat>> = {}
	const summarySource = raw?.segments ?? raw?.summary ?? {}
	for (const [rawKey, stat] of Object.entries(summarySource)) {
		const seg = normalizeSegmentKey(rawKey)
		if (!seg || !stat) continue
		summaries[seg] = normalizeCategoryStat(tag, stat)
	}

	const tokens: SymbolStatsBySegment = {}
	const rawTokens = raw?.tokens
	if (Array.isArray(rawTokens)) {
		// array of token entries each carrying `segments`
		Object.assign(tokens, normalizeTokensList({ tokens: rawTokens }))
	} else if (rawTokens && typeof rawTokens === 'object') {
		// segment-keyed arrays of merged symbol stats
		for (const [rawKey, list] of Object.entries(rawTokens)) {
			const seg = normalizeSegmentKey(rawKey)
			if (!seg || !Array.isArray(list)) continue
			tokens[seg] = list
				.map((entry) => {
					const base = (entry.base ?? entry.symbol ?? '').toString()
					if (!base) return null
					return normalizeSymbolStat(base, toStringArray(entry.tags) ?? [], entry as RawSegmentStat)
				})
				.filter((v): v is SymbolStat => v != null)
		}
	}

	return {
		tag,
		last_updated: raw?.last_updated ?? null,
		summaries,
		tokens,
		seriesByExchange: normalizeExchangeSeries({ series: raw?.series_by_exchange ?? raw?.seriesByExchange }),
		seriesByPair: normalizeCategoryPairSeries(raw?.series_by_pair ?? raw?.seriesByPair),
		series: normalizeCategorySeries({ series: raw?.series }, tag)
	}
}
