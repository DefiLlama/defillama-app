import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import {
	fetchRWAPerpsCurrent,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsMarketsByCoin,
	fetchRWAPerpsMarketsByVenue,
	fetchRWAPerpsStats,
	fetchRWAPerpsVenueChart
} from './api'
import type {
	IRWAPerpsAggregateHistoricalPoint,
	IRWAPerpsFundingHistoryResponse,
	IRWAPerpsMarket,
	IRWAPerpsMarketChartPoint,
	IRWAPerpsStatsResponse
} from './api.types'
import {
	getRWAPerpsOverviewBreakdownLabel,
	getRWAPerpsOverviewSnapshotBreakdownLabel,
	getRWAPerpsVenueBreakdownLabel
} from './breakdownLabels'
import type {
	IRWAPerpsCoinData,
	IRWAPerpsCoinFundingHistoryPoint,
	IRWAPerpsCoinMarketChartPoint,
	IRWAPerpsOverviewPageData,
	IRWAPerpsOverviewBreakdownRequest,
	IRWAPerpsTimeSeriesRow,
	IRWAPerpsVenueBreakdownRequest,
	IRWAPerpsVenuePageData,
	IRWAPerpsVenuesOverview,
	IRWAPerpsVenuesOverviewRow,
	RWAPerpsChartMetricKey,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsVenueNonTimeSeriesBreakdown
} from './types'

type SnapshotBreakdown = RWAPerpsOverviewNonTimeSeriesBreakdown | RWAPerpsVenueNonTimeSeriesBreakdown

type BreakdownLabelResolver<TRow, TBreakdown extends string> = (row: TRow, breakdown: TBreakdown) => string

const EMPTY_CHART_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
function safeNumber(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function safeRatio(value: number, total: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
	return value / total
}

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
}

function firstNonEmptyString(values: Array<string | null | undefined>): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim()
		}
	}

	return null
}

function uniqueNonEmptyStrings(values: Array<string | null | undefined>): string[] {
	return Array.from(
		new Set(
			values
				.filter((value): value is string => typeof value === 'string')
				.map((value) => value.trim())
				.filter(Boolean)
		)
	)
}

function normalizeMarketChart(points: IRWAPerpsMarketChartPoint[] | null): IRWAPerpsCoinMarketChartPoint[] | null {
	if (!points?.length) return null

	return ensureChronologicalRows(
		points.map((point) => ({
			...point,
			timestamp: toUnixMsTimestamp(point.timestamp)
		}))
	)
}

function normalizeFundingHistory(
	response: IRWAPerpsFundingHistoryResponse | null
): IRWAPerpsCoinFundingHistoryPoint[] | null {
	if (!response?.data?.length) return null

	return ensureChronologicalRows(
		response.data.map((point) => ({
			timestamp: toUnixMsTimestamp(point.timestamp),
			fundingRate: safeNumber(point.funding_rate),
			premium: safeNumber(point.premium),
			openInterest: safeNumber(point.open_interest),
			fundingPayment: safeNumber(point.funding_payment)
		}))
	)
}

function resolveCoinMarket(markets: IRWAPerpsMarket[], coin: string): IRWAPerpsMarket | null {
	const exactMatches = markets.filter((market) => market.coin === coin)
	return exactMatches.length === 1 ? exactMatches[0] : null
}

function sortSeriesByLatestValue(source: MultiSeriesChart2Dataset['source'], seenSeries: Set<string>): string[] {
	const latestValues = new Map<string, number>()

	for (const row of source) {
		for (const series of seenSeries) {
			const value = row[series]
			if (typeof value === 'number' && Number.isFinite(value)) {
				latestValues.set(series, value)
			}
		}
	}

	return [...seenSeries].sort((a, b) => {
		const diff = (latestValues.get(b) ?? 0) - (latestValues.get(a) ?? 0)
		if (diff !== 0) return diff
		return a.localeCompare(b)
	})
}

function toParameterizedBreakdownChartDataset<TRow extends IRWAPerpsTimeSeriesRow, TBreakdown extends string>({
	rows,
	breakdown,
	key,
	getBreakdownLabel
}: {
	rows: TRow[] | null
	breakdown: TBreakdown
	key: RWAPerpsChartMetricKey
	getBreakdownLabel: BreakdownLabelResolver<TRow, TBreakdown>
}): MultiSeriesChart2Dataset {
	if (!rows?.length) return EMPTY_CHART_DATASET

	const groupedRows = new Map<number, Record<string, number>>()
	const seenSeries = new Set<string>()

	for (const row of rows) {
		const seriesName = getBreakdownLabel(row, breakdown)

		const timestamp = toUnixMsTimestamp(row.timestamp)
		const metricValue = key === 'markets' ? 1 : safeNumber(row[key])
		const bucket = groupedRows.get(timestamp) ?? {}
		bucket[seriesName] = (bucket[seriesName] ?? 0) + metricValue
		groupedRows.set(timestamp, bucket)
		seenSeries.add(seriesName)
	}

	if (groupedRows.size === 0 || seenSeries.size === 0) return EMPTY_CHART_DATASET

	const source = ensureChronologicalRows(
		[...groupedRows.entries()].map(([timestamp, values]) => ({
			timestamp,
			...values
		}))
	)

	return {
		source,
		dimensions: ['timestamp', ...sortSeriesByLatestValue(source, seenSeries)]
	}
}

function buildSnapshotBreakdownTotals<TBreakdown extends SnapshotBreakdown>({
	rows,
	breakdown,
	key,
	getBreakdownLabel
}: {
	rows: IRWAPerpsMarket[]
	breakdown: TBreakdown
	key: RWAPerpsChartMetricKey
	getBreakdownLabel: BreakdownLabelResolver<IRWAPerpsMarket, TBreakdown>
}): Array<{ name: string; value: number }> {
	const totalsByLabel = new Map<string, number>()

	for (const row of rows) {
		const label = getBreakdownLabel(row, breakdown)
		if (!label) continue

		const value = key === 'markets' ? 1 : safeNumber(row[key])
		if (!Number.isFinite(value) || value < 0) continue

		totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + value)
	}

	return [...totalsByLabel.entries()]
		.map(([name, value]) => ({ name, value }))
		.filter((item) => item.value > 0)
		.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

async function fetchRWAPerpsBreakdownChartRows({
	seriesNames
}: {
	seriesNames: string[]
}): Promise<IRWAPerpsAggregateHistoricalPoint[]> {
	if (seriesNames.length === 0) {
		throw new Error('Failed to get RWA perps venue stats')
	}

	const responses = await Promise.all(seriesNames.map((seriesName) => fetchRWAPerpsVenueChart(seriesName)))

	return responses.flat()
}

export function hasEnoughTimeSeriesHistory(dataset: MultiSeriesChart2Dataset) {
	if ((dataset.source?.length ?? 0) === 0) return false
	const uniqueTimestamps = new Set(
		dataset.source.map((row) => Number(row.timestamp)).filter((timestamp) => Number.isFinite(timestamp))
	)
	return uniqueTimestamps.size >= 2 && dataset.dimensions.some((dimension) => dimension !== 'timestamp')
}

function assertHasVenueBuckets(stats: IRWAPerpsStatsResponse | null): asserts stats is IRWAPerpsStatsResponse {
	if (!stats?.byVenue || Object.keys(stats.byVenue).length === 0) {
		throw new Error('Failed to get RWA perps venue stats')
	}
}

function toVenueDetailLink(venue: string) {
	return `/rwa/perps/venue/${encodeURIComponent(venue)}`
}

function sumProtocolFees24h(markets: IRWAPerpsMarket[]) {
	return markets.reduce((sum, market) => sum + safeNumber(market.estimatedProtocolFees24h), 0)
}

function sortMarketsByOpenInterest(markets: IRWAPerpsMarket[]) {
	return [...markets].sort((a, b) => safeNumber(b.openInterest) - safeNumber(a.openInterest))
}

export async function getRWAPerpsCoinData({ coin }: { coin: string }): Promise<IRWAPerpsCoinData | null> {
	try {
		const markets = await fetchRWAPerpsMarketsByCoin(coin)
		if (!markets?.length) {
			return null
		}

		const market = resolveCoinMarket(markets, coin)
		if (!market) {
			return null
		}

		const [marketChart, fundingHistory] = await Promise.all([
			fetchRWAPerpsMarketChart(market.id)
				.then(normalizeMarketChart)
				.catch(() => null),
			fetchRWAPerpsFundingHistory(market.id)
				.then(normalizeFundingHistory)
				.catch(() => null)
		])

		const displayName = firstNonEmptyString([market.referenceAsset, market.coin.split(':')[1], market.coin])

		return {
			coin: {
				coin,
				displayName: displayName ?? coin,
				venue: market.venue,
				referenceAsset: firstNonEmptyString([market.referenceAsset]),
				referenceAssetGroup: firstNonEmptyString([market.referenceAssetGroup]),
				assetClass: firstNonEmptyString([market.assetClass]),
				rwaClassification: firstNonEmptyString([market.rwaClassification]),
				accessModel: firstNonEmptyString([market.accessModel]),
				parentPlatform: firstNonEmptyString([market.parentPlatform]),
				issuer: firstNonEmptyString([market.issuer]),
				website: firstNonEmptyString([market.website]),
				oracleProvider: firstNonEmptyString([market.oracleProvider]),
				description: firstNonEmptyString([market.description]),
				categories: uniqueNonEmptyStrings(market.category)
			},
			market,
			marketChart,
			fundingHistory
		}
	} catch (error) {
		console.error(`[rwa-perps] getRWAPerpsCoinData failed for ${coin}:`, error)
		return null
	}
}

export function toRWAPerpsBreakdownChartDataset({
	rows,
	breakdown,
	key
}: {
	rows: IRWAPerpsTimeSeriesRow[] | null
	breakdown: RWAPerpsOverviewNonTimeSeriesBreakdown
	key: RWAPerpsChartMetricKey
}): MultiSeriesChart2Dataset {
	return toParameterizedBreakdownChartDataset({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsOverviewBreakdownLabel
	})
}

export function buildRWAPerpsOverviewSnapshotBreakdownTotals({
	rows,
	breakdown,
	key
}: {
	rows: IRWAPerpsMarket[]
	breakdown: RWAPerpsOverviewNonTimeSeriesBreakdown
	key: RWAPerpsChartMetricKey
}) {
	return buildSnapshotBreakdownTotals({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsOverviewSnapshotBreakdownLabel
	})
}

export function buildRWAPerpsVenueSnapshotBreakdownTotals({
	rows,
	breakdown,
	key
}: {
	rows: IRWAPerpsMarket[]
	breakdown: RWAPerpsVenueNonTimeSeriesBreakdown
	key: RWAPerpsChartMetricKey
}) {
	return buildSnapshotBreakdownTotals({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsVenueBreakdownLabel
	})
}

export async function getRWAPerpsBreakdownChartDataset({
	breakdown,
	key,
	seriesNames
}: IRWAPerpsOverviewBreakdownRequest & { seriesNames?: string[] }): Promise<MultiSeriesChart2Dataset> {
	if (breakdown === 'venue') {
		const stats = seriesNames ? null : await fetchRWAPerpsStats()
		const resolvedSeriesNames = seriesNames ?? Object.keys(stats?.byVenue ?? {})
		const rows = await fetchRWAPerpsBreakdownChartRows({ seriesNames: resolvedSeriesNames })
		return toRWAPerpsBreakdownChartDataset({ rows, breakdown, key })
	}

	const list = await fetchRWAPerpsList()
	const rows = (await Promise.all(list.venues.map((venue) => fetchRWAPerpsVenueChart(venue)))).flat()

	return toParameterizedBreakdownChartDataset({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsOverviewBreakdownLabel
	})
}

export async function getRWAPerpsVenueBreakdownChartDataset({
	venue,
	breakdown,
	key
}: IRWAPerpsVenueBreakdownRequest): Promise<MultiSeriesChart2Dataset> {
	const rows = await fetchRWAPerpsVenueChart(venue)
	return toParameterizedBreakdownChartDataset({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsVenueBreakdownLabel
	})
}

export async function getRWAPerpsOverview(): Promise<IRWAPerpsOverviewPageData> {
	const [list, stats, current] = await Promise.all([fetchRWAPerpsList(), fetchRWAPerpsStats(), fetchRWAPerpsCurrent()])

	if (!list || !stats || !current) {
		throw new Error('Failed to get RWA perps overview')
	}

	const initialChartDataset = await getRWAPerpsBreakdownChartDataset({
		breakdown: 'venue',
		key: 'openInterest',
		seriesNames: list.venues
	})

	return {
		markets: sortMarketsByOpenInterest(current),
		initialChartDataset,
		totals: {
			openInterest: safeNumber(stats.totalOpenInterest),
			volume24h: safeNumber(stats.totalVolume24h),
			markets: safeNumber(stats.totalMarkets),
			cumulativeFunding: safeNumber(stats.totalCumulativeFunding)
		}
	}
}

export async function getRWAPerpsVenuePage({ venue }: { venue: string }): Promise<IRWAPerpsVenuePageData | null> {
	const [list, stats, venueResponse] = await Promise.all([
		fetchRWAPerpsList(),
		fetchRWAPerpsStats(),
		fetchRWAPerpsMarketsByVenue(venue).catch(() => null)
	])

	if (!list || !stats || !venueResponse) return null
	if (!list.venues.includes(venue)) return null

	const markets = venueResponse.data ?? []
	if (markets.length === 0) return null

	const initialChartDataset = await getRWAPerpsVenueBreakdownChartDataset({
		venue,
		breakdown: 'referenceAsset',
		key: 'openInterest'
	})

	const statsBucket = stats.byVenue?.[venue]

	return {
		venue,
		markets: sortMarketsByOpenInterest(markets),
		initialChartDataset,
		venueLinks: [
			{ label: 'All', to: '/rwa/perps/venues' },
			...list.venues.map((item) => ({ label: item, to: toVenueDetailLink(item) }))
		],
		totals: {
			openInterest: safeNumber(statsBucket?.openInterest),
			volume24h: safeNumber(statsBucket?.volume24h),
			markets: safeNumber(statsBucket?.markets ?? venueResponse.total ?? markets.length),
			protocolFees24h: sumProtocolFees24h(markets)
		}
	}
}

export async function getRWAPerpsVenuesOverview(): Promise<IRWAPerpsVenuesOverview> {
	const stats = await fetchRWAPerpsStats()
	assertHasVenueBuckets(stats)
	const initialChartDataset = await getRWAPerpsBreakdownChartDataset({
		breakdown: 'venue',
		key: 'openInterest',
		seriesNames: Object.keys(stats.byVenue)
	})

	const rows: IRWAPerpsVenuesOverviewRow[] = Object.entries(stats.byVenue).map(([venue, bucket]) => ({
		venue,
		openInterest: bucket.openInterest,
		openInterestShare: safeRatio(bucket.openInterest, stats.totalOpenInterest),
		volume24h: bucket.volume24h,
		volume24hShare: safeRatio(bucket.volume24h, stats.totalVolume24h),
		markets: bucket.markets
	}))

	return {
		rows: rows.sort((a, b) => b.openInterest - a.openInterest),
		initialChartDataset
	}
}
