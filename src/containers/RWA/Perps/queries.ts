import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { getPercentChange } from '~/utils'
import {
	fetchRWAPerpsCurrent,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketsByVenue,
	fetchRWAPerpsStats,
	fetchRWAPerpsVenueChart
} from './api'
import type {
	IRWAPerpsAggregateHistoricalPoint,
	IRWAPerpsFundingHistoryPoint,
	IRWAPerpsMarket,
	IRWAPerpsMarketChartPoint,
	IRWAPerpsStatsResponse
} from './api.types'
import {
	getRWAPerpsOverviewBreakdownLabel,
	getRWAPerpsOverviewSnapshotBreakdownLabel,
	getRWAPerpsVenueBreakdownLabel,
	getRWAPerpsVenueSnapshotBreakdownLabel
} from './breakdownLabels'
import type {
	IRWAPerpsContractData,
	IRWAPerpsContractFundingHistoryPoint,
	IRWAPerpsContractMarketChartPoint,
	IRWAPerpsOverviewPageData,
	IRWAPerpsOverviewBreakdownRequest,
	IRWAPerpsTimeSeriesRow,
	IRWAPerpsVenueBreakdownRequest,
	IRWAPerpsVenuePageData,
	IRWAPerpsVenuesOverview,
	IRWAPerpsVenuesOverviewRow,
	RWAPerpsChartMetricKey,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsOverviewSnapshotBreakdown,
	RWAPerpsVenueSnapshotBreakdown
} from './types'

type SnapshotBreakdown = RWAPerpsOverviewSnapshotBreakdown | RWAPerpsVenueSnapshotBreakdown

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

function getPrimaryAssetClass(assetClass: string[] | null): string | null {
	return assetClass?.[0] ?? null
}

function normalizeMarketChart(points: IRWAPerpsMarketChartPoint[] | null): IRWAPerpsContractMarketChartPoint[] | null {
	if (!points?.length) return null

	return ensureChronologicalRows(
		points.map((point) => ({
			...point,
			timestamp: toUnixMsTimestamp(point.timestamp)
		}))
	)
}

function normalizeFundingHistory(
	points: IRWAPerpsFundingHistoryPoint[] | null
): IRWAPerpsContractFundingHistoryPoint[] | null {
	if (!points?.length) return null

	return ensureChronologicalRows(
		points.map((point) => ({
			timestamp: toUnixMsTimestamp(point.timestamp),
			fundingRate: safeNumber(point.funding_rate),
			premium: safeNumber(point.premium),
			openInterest: safeNumber(point.open_interest),
			fundingPayment: safeNumber(point.funding_payment)
		}))
	)
}

function resolveContractMarket(markets: IRWAPerpsMarket[], contract: string): IRWAPerpsMarket | null {
	const exactMatches = markets.filter((market) => market.contract === contract)
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

function getSnapshotTotals(
	rows: IRWAPerpsAggregateHistoricalPoint[],
	key: 'openInterest' | 'volume24h'
): { latestTotal: number | null; previousTotal: number | null } {
	if (rows.length === 0) return { latestTotal: null, previousTotal: null }

	const timestamps = [...new Set(rows.map((row) => toUnixMsTimestamp(row.timestamp)))].sort((a, b) => b - a)
	const latestTimestamp = timestamps[0]
	const previousTimestamp = timestamps[1]

	if (latestTimestamp === undefined) {
		return { latestTotal: null, previousTotal: null }
	}

	const latestTotal = rows.reduce((sum, row) => {
		if (toUnixMsTimestamp(row.timestamp) !== latestTimestamp) return sum
		return sum + safeNumber(row[key])
	}, 0)

	if (previousTimestamp === undefined) {
		return { latestTotal: latestTotal > 0 ? latestTotal : null, previousTotal: null }
	}

	const previousTotal = rows.reduce((sum, row) => {
		if (toUnixMsTimestamp(row.timestamp) !== previousTimestamp) return sum
		return sum + safeNumber(row[key])
	}, 0)

	return {
		latestTotal: latestTotal > 0 ? latestTotal : null,
		previousTotal: previousTotal > 0 ? previousTotal : null
	}
}

export async function getRWAPerpsContractData({
	contract
}: {
	contract: string
}): Promise<IRWAPerpsContractData | null> {
	try {
		const markets = await fetchRWAPerpsMarketsByContract(contract)
		if (!markets?.length) {
			return null
		}

		const market = resolveContractMarket(markets, contract)
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

		const displayName = market.referenceAsset ?? market.contract.split(':')[1] ?? market.contract

		return {
			contract: {
				contract,
				displayName,
				venue: market.venue,
				baseAsset: market.referenceAsset,
				baseAssetGroup: market.referenceAssetGroup,
				assetClass: getPrimaryAssetClass(market.assetClass),
				rwaClassification: market.rwaClassification,
				accessModel: market.accessModel,
				parentPlatform: market.parentPlatform,
				issuer: market.issuer,
				website: market.website?.[0] ?? null,
				oracleProvider: market.oracleProvider,
				description: market.description,
				categories: market.category ?? []
			},
			market,
			marketChart,
			fundingHistory
		}
	} catch (error) {
		console.error(`[rwa-perps] getRWAPerpsContractData failed for ${contract}:`, error)
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
	breakdown: RWAPerpsOverviewSnapshotBreakdown
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
	breakdown: RWAPerpsVenueSnapshotBreakdown
	key: RWAPerpsChartMetricKey
}) {
	return buildSnapshotBreakdownTotals({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsVenueSnapshotBreakdownLabel
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

	const overviewChartRows = await fetchRWAPerpsBreakdownChartRows({ seriesNames: list.venues })
	const initialChartDataset = toRWAPerpsBreakdownChartDataset({
		rows: overviewChartRows,
		breakdown: 'baseAsset',
		key: 'openInterest'
	})
	const openInterestSnapshotTotals = getSnapshotTotals(overviewChartRows, 'openInterest')
	const volume24hSnapshotTotals = getSnapshotTotals(overviewChartRows, 'volume24h')
	const totalOpenInterest = openInterestSnapshotTotals.latestTotal ?? safeNumber(stats.totalOpenInterest)
	const totalVolume24h = volume24hSnapshotTotals.latestTotal ?? safeNumber(stats.totalVolume24h)

	return {
		markets: sortMarketsByOpenInterest(current),
		initialChartDataset,
		totals: {
			openInterest: totalOpenInterest,
			openInterestChange24h: getPercentChange(totalOpenInterest, openInterestSnapshotTotals.previousTotal),
			volume24h: totalVolume24h,
			volume24hChange24h: getPercentChange(totalVolume24h, volume24hSnapshotTotals.previousTotal),
			markets: safeNumber(stats.totalMarkets),
			protocolFees24h: sumProtocolFees24h(current),
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

	const markets = venueResponse
	if (markets.length === 0) return null

	const initialChartDataset = await getRWAPerpsVenueBreakdownChartDataset({
		venue,
		breakdown: 'baseAsset',
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
			markets: safeNumber(statsBucket?.markets ?? markets.length),
			protocolFees24h: sumProtocolFees24h(markets)
		}
	}
}

export async function getRWAPerpsVenuesOverview(): Promise<IRWAPerpsVenuesOverview> {
	const stats = await fetchRWAPerpsStats()
	assertHasVenueBuckets(stats)
	const initialChartDataset = await getRWAPerpsBreakdownChartDataset({
		breakdown: 'baseAsset',
		key: 'openInterest'
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
