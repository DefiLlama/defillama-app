import type {
	CexAnalyticsMarketSharePoint,
	CexAnalyticsSnapshotResponse,
	CexAnalyticsTotalsPoint,
	CexAnalyticsView
} from '~/containers/ProDashboard/types'
import { llamaDb } from '~/server/db/llama'
import metadataCache, { refreshMetadataIfStale } from '~/utils/metadata'

type SnapshotSourceRow = {
	loaded_at: string | null
	venue: string
	spotVolume24h: number
	derivativesVolume24h: number
	openInterest: number | null
	avgLeverage: number | null
	cleanTvl: number | null
}

type DailySourceRow = {
	date: number
	venue: string
	spotVolume: number
	derivativesVolume: number
}

type Metric = 'spot' | 'derivatives'

const DAILY_SECONDS = 86_400

function toCexKey(value: string | null | undefined) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function fallbackCexName(raw: string) {
	return raw
		.split('-')
		.filter(Boolean)
		.map((part) => {
			if (part === 'cex') return 'CEX'
			if (part === 'okx' || part === 'htx' || part === 'mexc' || part === 'weex') return part.toUpperCase()
			if (part === 'kucoin') return 'KuCoin'
			return part.charAt(0).toUpperCase() + part.slice(1)
		})
		.join(' ')
}

async function getCexNameLookup() {
	await refreshMetadataIfStale()

	const lookup = new Map<string, string>()
	for (const cex of metadataCache.cexs) {
		if (cex.slug) lookup.set(toCexKey(cex.slug), cex.name)
		lookup.set(toCexKey(cex.name), cex.name)
	}

	return lookup
}

function getCexDisplayName(raw: string, lookup: Map<string, string>) {
	if (raw === 'Other') return raw
	return lookup.get(toCexKey(raw)) ?? fallbackCexName(raw)
}

export async function getCexAnalyticsSnapshot(): Promise<CexAnalyticsSnapshotResponse> {
	const cexNameLookup = await getCexNameLookup()
	const rows = await llamaDb.any<SnapshotSourceRow>(`
		SELECT
			loaded_at,
			cex AS venue,
			COALESCE(volume_spot, 0) AS "spotVolume24h",
			COALESCE(volume_derivative, 0) AS "derivativesVolume24h",
			open_interest AS "openInterest",
			avg_leverage AS "avgLeverage",
			tvl_clean AS "cleanTvl"
		FROM lens.cex_volume_current
	`)

	const mergedByVenue = new Map<
		string,
		{
			loadedAt: string | null
			spotVolume24h: number
			derivativesVolume24h: number
			openInterest: number | null
			cleanTvl: number | null
			avgLeverageNumerator: number
			avgLeverageDenominator: number
		}
	>()
	for (const row of rows) {
		const venue = getCexDisplayName(row.venue, cexNameLookup)
		const current = mergedByVenue.get(venue) ?? {
			loadedAt: row.loaded_at,
			spotVolume24h: 0,
			derivativesVolume24h: 0,
			openInterest: null,
			cleanTvl: null,
			avgLeverageNumerator: 0,
			avgLeverageDenominator: 0
		}

		current.loadedAt = current.loadedAt ?? row.loaded_at
		current.spotVolume24h += row.spotVolume24h
		current.derivativesVolume24h += row.derivativesVolume24h
		current.openInterest = (current.openInterest ?? 0) + (row.openInterest ?? 0)
		current.cleanTvl = (current.cleanTvl ?? 0) + (row.cleanTvl ?? 0)

		if (row.openInterest && row.openInterest > 0 && row.avgLeverage != null) {
			current.avgLeverageNumerator += row.openInterest * row.avgLeverage
			current.avgLeverageDenominator += row.openInterest
		}

		mergedByVenue.set(venue, current)
	}

	const mergedRows = [...mergedByVenue.entries()].map(([venue, row]) => ({
		venue,
		loaded_at: row.loadedAt,
		spotVolume24h: row.spotVolume24h,
		derivativesVolume24h: row.derivativesVolume24h,
		openInterest: row.openInterest,
		avgLeverage: row.avgLeverageDenominator > 0 ? row.avgLeverageNumerator / row.avgLeverageDenominator : null,
		cleanTvl: row.cleanTvl
	}))

	const totalSpotVolume = mergedRows.reduce((sum, row) => sum + row.spotVolume24h, 0)
	const totalDerivativesVolume = mergedRows.reduce((sum, row) => sum + row.derivativesVolume24h, 0)
	const totalOpenInterest = mergedRows.reduce((sum, row) => sum + (row.openInterest ?? 0), 0)
	const totalCleanTvl = mergedRows.reduce((sum, row) => sum + Math.max(row.cleanTvl ?? 0, 0), 0)

	let weightedLeverageNumerator = 0
	let weightedLeverageDenominator = 0
	for (const row of mergedRows) {
		if (row.openInterest && row.openInterest > 0 && row.avgLeverage != null) {
			weightedLeverageNumerator += row.openInterest * row.avgLeverage
			weightedLeverageDenominator += row.openInterest
		}
	}

	const normalizedRows = mergedRows
		.map((row) => {
			const totalVolume = row.spotVolume24h + row.derivativesVolume24h
			return {
				venue: row.venue,
				spotVolume24h: row.spotVolume24h,
				derivativesVolume24h: row.derivativesVolume24h,
				spotShare: totalSpotVolume > 0 ? (row.spotVolume24h / totalSpotVolume) * 100 : 0,
				derivativesShare: totalDerivativesVolume > 0 ? (row.derivativesVolume24h / totalDerivativesVolume) * 100 : 0,
				derivativesToSpotRatio: row.spotVolume24h > 0 ? row.derivativesVolume24h / row.spotVolume24h : null,
				openInterest: row.openInterest,
				avgLeverage: row.avgLeverage,
				cleanTvl: row.cleanTvl,
				volumeToTvl: row.cleanTvl && row.cleanTvl > 0 ? totalVolume / row.cleanTvl : null
			}
		})
		.sort((a, b) => {
			if (b.derivativesVolume24h !== a.derivativesVolume24h) {
				return b.derivativesVolume24h - a.derivativesVolume24h
			}
			return b.spotVolume24h - a.spotVolume24h
		})

	return {
		rows: normalizedRows,
		summary: {
			totalSpotVolume,
			totalDerivativesVolume,
			totalOpenInterest,
			totalCleanTvl,
			weightedAvgLeverage:
				weightedLeverageDenominator > 0 ? weightedLeverageNumerator / weightedLeverageDenominator : null,
			loadedAt: rows[0]?.loaded_at ?? null
		}
	}
}

export async function getCexAnalyticsTotals(): Promise<CexAnalyticsTotalsPoint[]> {
	const rows = await llamaDb.any<CexAnalyticsTotalsPoint>(`
		SELECT
			EXTRACT(EPOCH FROM date)::int AS date,
			COALESCE(SUM(volume_spot), 0) AS "spotVolume",
			COALESCE(SUM(volume_derivative), 0) AS "derivativesVolume"
		FROM lens.cex_volume_daily
		GROUP BY date
		ORDER BY date ASC
	`)

	return rows
}

export async function getCexAnalyticsMarketShare(
	metric: Metric,
	topN: number
): Promise<CexAnalyticsMarketSharePoint[]> {
	const cexNameLookup = await getCexNameLookup()
	const rows = await llamaDb.any<DailySourceRow>(`
		SELECT
			EXTRACT(EPOCH FROM date)::int AS date,
			cex AS venue,
			COALESCE(volume_spot, 0) AS "spotVolume",
			COALESCE(volume_derivative, 0) AS "derivativesVolume"
		FROM lens.cex_volume_daily
		ORDER BY date ASC, venue ASC
	`)

	if (rows.length === 0) {
		return []
	}

	const latestDate = rows[rows.length - 1].date
	const cutoff = latestDate - 29 * DAILY_SECONDS
	const metricKey = metric === 'spot' ? 'spotVolume' : 'derivativesVolume'

	const recentTotals = new Map<string, number>()
	for (const row of rows) {
		if (row.date < cutoff) continue
		recentTotals.set(row.venue, (recentTotals.get(row.venue) ?? 0) + row[metricKey])
	}

	const topVenues = new Set(
		[...recentTotals.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, topN)
			.map(([venue]) => venue)
	)

	const valuesByDate = new Map<number, Map<string, number>>()
	for (const row of rows) {
		const bucket = topVenues.has(row.venue) ? getCexDisplayName(row.venue, cexNameLookup) : 'Other'
		const dateMap = valuesByDate.get(row.date) ?? new Map<string, number>()
		dateMap.set(bucket, (dateMap.get(bucket) ?? 0) + row[metricKey])
		valuesByDate.set(row.date, dateMap)
	}

	const points: CexAnalyticsMarketSharePoint[] = []
	for (const [date, venueMap] of [...valuesByDate.entries()].sort((a, b) => a[0] - b[0])) {
		let total = 0
		for (const value of venueMap.values()) {
			total += value
		}

		for (const [venue, value] of venueMap.entries()) {
			points.push({
				date,
				venue,
				share: total > 0 ? (value / total) * 100 : 0
			})
		}
	}

	return points
}

export const isCexAnalyticsView = (value: string | undefined): value is CexAnalyticsView =>
	value === 'summary' || value === 'comparison' || value === 'spot-vs-derivatives' || value === 'market-share'
