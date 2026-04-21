import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { getPercentChange } from '~/utils'
import {
	fetchRWAPerpsContractBreakdownChartData,
	fetchRWAPerpsCurrent,
	fetchRWAPerpsFundingHistory,
	fetchRWAPerpsList,
	fetchRWAPerpsMarketChart,
	fetchRWAPerpsMarketsByAssetGroup,
	fetchRWAPerpsMarketsByContract,
	fetchRWAPerpsMarketsByVenue,
	fetchRWAPerpsOverviewBreakdownChartData,
	fetchRWAPerpsStats
} from './api'
import type {
	IRWAPerpsBreakdownChartResponse,
	IRWAPerpsFundingHistoryPoint,
	IRWAPerpsMarket,
	IRWAPerpsMarketChartPoint,
	IRWAPerpsStatsResponse
} from './api.types'
import { toRWAPerpsBreakdownChartDataset } from './breakdownDataset'
import { getRWAPerpsOverviewSnapshotBreakdownLabel, getRWAPerpsVenueSnapshotBreakdownLabel } from './breakdownLabels'
import { getDefaultRWAPerpsChartBreakdown, getDefaultRWAPerpsChartView } from './chartState'
import type {
	IRWAPerpsAssetGroupBreakdownRequest,
	IRWAPerpsAssetGroupPageData,
	IRWAPerpsAssetGroupsOverview,
	IRWAPerpsAssetGroupsOverviewRow,
	IRWAPerpsContractData,
	IRWAPerpsContractBreakdownRequest,
	IRWAPerpsContractFundingHistoryPoint,
	IRWAPerpsContractMarketChartPoint,
	IRWAPerpsOverviewPageData,
	IRWAPerpsOverviewBreakdownRequest,
	IRWAPerpsVenueBreakdownRequest,
	IRWAPerpsVenuePageData,
	IRWAPerpsVenuesOverview,
	IRWAPerpsVenuesOverviewRow,
	RWAPerpsAssetGroupSnapshotBreakdown,
	RWAPerpsChartMetricKey,
	RWAPerpsChartView,
	RWAPerpsOverviewSnapshotBreakdown,
	RWAPerpsVenueSnapshotBreakdown
} from './types'

type SnapshotBreakdown =
	| RWAPerpsOverviewSnapshotBreakdown
	| RWAPerpsVenueSnapshotBreakdown
	| RWAPerpsAssetGroupSnapshotBreakdown

type BreakdownLabelResolver<TRow, TBreakdown extends string> = (row: TRow, breakdown: TBreakdown) => string

const EMPTY_CHART_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }

function shouldPreloadInitialChartDataset(activeView: RWAPerpsChartView) {
	return activeView === 'timeSeries'
}

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

function assertHasAssetGroupBuckets(stats: IRWAPerpsStatsResponse | null): asserts stats is IRWAPerpsStatsResponse {
	if (!stats?.byAssetGroup) {
		throw new Error('Failed to get RWA perps asset-group stats')
	}

	for (const _assetGroup in stats.byAssetGroup) {
		return
	}

	throw new Error('Failed to get RWA perps asset-group stats')
}

export function hasEnoughTimeSeriesHistory(dataset: MultiSeriesChart2Dataset) {
	if ((dataset.source?.length ?? 0) === 0) return false
	const uniqueTimestamps = new Set(
		dataset.source.map((row) => Number(row.timestamp)).filter((timestamp) => Number.isFinite(timestamp))
	)
	return uniqueTimestamps.size >= 2 && dataset.dimensions.some((dimension) => dimension !== 'timestamp')
}

export function groupRWAPerpsTimeSeriesDataset(dataset: MultiSeriesChart2Dataset): MultiSeriesChart2Dataset {
	const seriesDimensions = dataset.dimensions.filter((dimension) => dimension !== 'timestamp')
	if (dataset.source.length === 0 || seriesDimensions.length === 0) return EMPTY_CHART_DATASET

	return {
		source: ensureChronologicalRows(
			dataset.source.map((row) => ({
				timestamp: row.timestamp,
				Total: seriesDimensions.reduce((sum, dimension) => {
					const value = row[dimension]
					const numericValue = typeof value === 'number' ? value : Number(value)
					return Number.isFinite(numericValue) ? sum + numericValue : sum
				}, 0)
			}))
		),
		dimensions: ['timestamp', 'Total']
	}
}

export function appendRWAPerpsTimeSeriesDatasetTotal(dataset: MultiSeriesChart2Dataset): MultiSeriesChart2Dataset {
	const seriesDimensions = dataset.dimensions.filter((dimension) => dimension !== 'timestamp' && dimension !== 'Total')
	if (dataset.source.length === 0) return EMPTY_CHART_DATASET
	if (seriesDimensions.length === 0) return dataset

	return {
		source: ensureChronologicalRows(
			dataset.source.map((row) => ({
				...row,
				timestamp: row.timestamp,
				Total: seriesDimensions.reduce((sum, dimension) => {
					const value = row[dimension]
					const numericValue = typeof value === 'number' ? value : Number(value)
					return Number.isFinite(numericValue) ? sum + numericValue : sum
				}, 0)
			}))
		),
		dimensions: ['timestamp', 'Total', ...seriesDimensions]
	}
}

function assertHasVenueBuckets(stats: IRWAPerpsStatsResponse | null): asserts stats is IRWAPerpsStatsResponse {
	if (!stats?.byVenue) {
		throw new Error('Failed to get RWA perps venue stats')
	}

	for (const _venue in stats.byVenue) {
		return
	}

	throw new Error('Failed to get RWA perps venue stats')
}

function toVenueDetailLink(venue: string) {
	return `/rwa/perps/venue/${rwaSlug(venue)}`
}

function sumProtocolFees24h(markets: IRWAPerpsMarket[]) {
	return markets.reduce((sum, market) => sum + safeNumber(market.estimatedProtocolFees24h), 0)
}

function sumMarketMetric(markets: IRWAPerpsMarket[], key: 'openInterest' | 'volume24h') {
	return markets.reduce((sum, market) => sum + safeNumber(market[key]), 0)
}

function sortMarketsByOpenInterest(markets: IRWAPerpsMarket[]) {
	return [...markets].sort((a, b) => safeNumber(b.openInterest) - safeNumber(a.openInterest))
}

function derivePreviousValueFromPercentChange(
	currentValue: number,
	percentChange: number | null | undefined
): number | null {
	if (!Number.isFinite(currentValue) || currentValue < 0 || percentChange == null || !Number.isFinite(percentChange)) {
		return null
	}

	const denominator = 1 + percentChange / 100
	if (!Number.isFinite(denominator) || denominator <= 0) return null

	return currentValue / denominator
}

function getAggregateMarketChange24h(
	markets: IRWAPerpsMarket[],
	config: {
		valueKey: 'openInterest' | 'volume24h'
		changeKey: 'openInterestChange24h' | 'volume24hChange24h'
		minCoverage?: number
	}
): number | null {
	const minCoverage = config.minCoverage ?? 0.95
	let totalCurrent = 0
	let comparableCurrent = 0
	let comparablePrevious = 0
	let hasComparableMarket = false

	for (const market of markets) {
		const currentValue = safeNumber(market[config.valueKey])
		totalCurrent += currentValue

		if (currentValue <= 0 && market[config.changeKey] == null) continue

		const previousValue = derivePreviousValueFromPercentChange(currentValue, market[config.changeKey])
		if (previousValue == null) continue

		comparableCurrent += currentValue
		comparablePrevious += previousValue
		hasComparableMarket = true
	}

	if (!hasComparableMarket || comparablePrevious <= 0) return null
	if (totalCurrent > 0 && comparableCurrent / totalCurrent < minCoverage) return null

	return getPercentChange(comparableCurrent, comparablePrevious)
}

function getAggregateOpenInterestChange24h(markets: IRWAPerpsMarket[]): number | null {
	return getAggregateMarketChange24h(markets, {
		valueKey: 'openInterest',
		changeKey: 'openInterestChange24h'
	})
}

function getAggregateVolume24hChange24h(markets: IRWAPerpsMarket[]): number | null {
	return getAggregateMarketChange24h(markets, {
		valueKey: 'volume24h',
		changeKey: 'volume24hChange24h'
	})
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

export function buildRWAPerpsAssetGroupSnapshotBreakdownTotals({
	rows,
	breakdown,
	key
}: {
	rows: IRWAPerpsMarket[]
	breakdown: RWAPerpsAssetGroupSnapshotBreakdown
	key: RWAPerpsChartMetricKey
}) {
	return buildSnapshotBreakdownTotals({
		rows,
		breakdown,
		key,
		getBreakdownLabel: getRWAPerpsOverviewSnapshotBreakdownLabel
	})
}

function toAssetGroupDetailLink(assetGroup: string) {
	return `/rwa/perps/asset-group/${rwaSlug(assetGroup)}`
}

async function getRequiredOverviewBreakdownRows(
	request:
		| (IRWAPerpsOverviewBreakdownRequest & { venue?: string; assetGroup?: string })
		| IRWAPerpsVenueBreakdownRequest
		| IRWAPerpsAssetGroupBreakdownRequest
): Promise<IRWAPerpsBreakdownChartResponse> {
	const rows = await fetchRWAPerpsOverviewBreakdownChartData(request)
	if (!rows) throw new Error('Failed to get RWA perps breakdown chart data')
	return rows
}

async function getRequiredContractBreakdownRows(
	request: IRWAPerpsContractBreakdownRequest
): Promise<IRWAPerpsBreakdownChartResponse> {
	const rows = await fetchRWAPerpsContractBreakdownChartData(request)
	if (!rows) throw new Error('Failed to get RWA perps contract breakdown chart data')
	return rows
}

export async function getRWAPerpsBreakdownChartDataset({
	breakdown,
	key,
	venue,
	assetGroup
}: IRWAPerpsOverviewBreakdownRequest & {
	venue?: string
	assetGroup?: string
}): Promise<MultiSeriesChart2Dataset> {
	const rows = await getRequiredOverviewBreakdownRows({ breakdown, key, venue, assetGroup })
	return toRWAPerpsBreakdownChartDataset(rows)
}

export async function getRWAPerpsContractBreakdownChartDataset(
	request: IRWAPerpsContractBreakdownRequest
): Promise<MultiSeriesChart2Dataset> {
	const rows = await getRequiredContractBreakdownRows(request)
	return toRWAPerpsBreakdownChartDataset(rows)
}

async function getInitialTimeSeriesDataset({
	mode,
	venue,
	assetGroup
}: {
	mode: 'overview' | 'venue' | 'assetGroup'
	venue?: string
	assetGroup?: string
}): Promise<MultiSeriesChart2Dataset> {
	const defaultBreakdown = getDefaultRWAPerpsChartBreakdown(mode, 'timeSeries')
	if (defaultBreakdown === 'contract') {
		return getRWAPerpsContractBreakdownChartDataset({
			key: 'openInterest',
			venue,
			assetGroup
		})
	}

	return getRWAPerpsBreakdownChartDataset({
		breakdown: defaultBreakdown as IRWAPerpsOverviewBreakdownRequest['breakdown'],
		key: 'openInterest',
		venue,
		assetGroup
	})
}

export async function getRWAPerpsOverview({
	activeView = getDefaultRWAPerpsChartView('overview')
}: {
	activeView?: RWAPerpsChartView
} = {}): Promise<IRWAPerpsOverviewPageData> {
	const [stats, current] = await Promise.all([fetchRWAPerpsStats(), fetchRWAPerpsCurrent()])

	if (!stats || !current) {
		throw new Error('Failed to get RWA perps overview')
	}

	const initialChartDataset = shouldPreloadInitialChartDataset(activeView)
		? await getInitialTimeSeriesDataset({ mode: 'overview' })
		: EMPTY_CHART_DATASET
	const totalOpenInterest = sumMarketMetric(current, 'openInterest')
	const totalVolume24h = sumMarketMetric(current, 'volume24h')

	return {
		markets: sortMarketsByOpenInterest(current),
		initialChartDataset,
		totals: {
			openInterest: totalOpenInterest,
			openInterestChange24h: getAggregateOpenInterestChange24h(current),
			volume24h: totalVolume24h,
			volume24hChange24h: getAggregateVolume24hChange24h(current),
			markets: safeNumber(stats.totalMarkets),
			protocolFees24h: sumProtocolFees24h(current),
			cumulativeFunding: safeNumber(stats.totalCumulativeFunding)
		}
	}
}

export async function getRWAPerpsVenuePage({
	venue,
	activeView = getDefaultRWAPerpsChartView('venue')
}: {
	venue: string
	activeView?: RWAPerpsChartView
}): Promise<IRWAPerpsVenuePageData | null> {
	const [list, stats] = await Promise.all([fetchRWAPerpsList(), fetchRWAPerpsStats()])
	if (!list || !stats) return null

	const resolvedVenue = list.venues.find((item) => rwaSlug(item) === rwaSlug(venue))
	if (!resolvedVenue) return null

	const venueResponse = await fetchRWAPerpsMarketsByVenue(resolvedVenue).catch(() => null)
	if (!venueResponse) return null

	const markets = venueResponse
	if (markets.length === 0) return null

	const initialChartDataset = shouldPreloadInitialChartDataset(activeView)
		? await getInitialTimeSeriesDataset({ mode: 'venue', venue: resolvedVenue })
		: EMPTY_CHART_DATASET

	const statsBucket = stats.byVenue?.[resolvedVenue]
	const totalOpenInterest = sumMarketMetric(markets, 'openInterest')
	const totalVolume24h = sumMarketMetric(markets, 'volume24h')

	return {
		venue: resolvedVenue,
		markets: sortMarketsByOpenInterest(markets),
		initialChartDataset,
		venueLinks: [
			{ label: 'All', to: '/rwa/perps/venues' },
			...list.venues.map((item) => ({ label: item, to: toVenueDetailLink(item) }))
		],
		totals: {
			openInterest: totalOpenInterest,
			openInterestChange24h: getAggregateOpenInterestChange24h(markets),
			volume24h: totalVolume24h,
			volume24hChange24h: getAggregateVolume24hChange24h(markets),
			markets: safeNumber(statsBucket?.markets ?? markets.length),
			protocolFees24h: sumProtocolFees24h(markets)
		}
	}
}

export async function getRWAPerpsVenuesOverview(): Promise<IRWAPerpsVenuesOverview> {
	const stats = await fetchRWAPerpsStats()
	assertHasVenueBuckets(stats)
	const initialChartDataset = await getRWAPerpsBreakdownChartDataset({
		breakdown: 'venue',
		key: 'openInterest'
	})

	const rows: IRWAPerpsVenuesOverviewRow[] = []
	for (const venue in stats.byVenue) {
		const bucket = stats.byVenue[venue]
		rows.push({
			venue,
			openInterest: bucket.openInterest,
			openInterestShare: safeRatio(bucket.openInterest, stats.totalOpenInterest),
			volume24h: bucket.volume24h,
			volume24hShare: safeRatio(bucket.volume24h, stats.totalVolume24h),
			markets: bucket.markets
		})
	}

	return {
		rows: rows.sort((a, b) => b.openInterest - a.openInterest),
		initialChartDataset
	}
}

export async function getRWAPerpsAssetGroupPage({
	assetGroup,
	activeView = getDefaultRWAPerpsChartView('assetGroup')
}: {
	assetGroup: string
	activeView?: RWAPerpsChartView
}): Promise<IRWAPerpsAssetGroupPageData | null> {
	const [list, stats] = await Promise.all([fetchRWAPerpsList(), fetchRWAPerpsStats()])
	if (!list || !stats) return null

	const resolvedAssetGroup = list.assetGroups.find((item) => rwaSlug(item) === rwaSlug(assetGroup))
	if (!resolvedAssetGroup) return null

	const markets = await fetchRWAPerpsMarketsByAssetGroup(resolvedAssetGroup).catch(() => null)
	if (!markets?.length) return null

	const initialChartDataset = shouldPreloadInitialChartDataset(activeView)
		? await getInitialTimeSeriesDataset({ mode: 'assetGroup', assetGroup: resolvedAssetGroup })
		: EMPTY_CHART_DATASET

	const statsBucket = stats.byAssetGroup?.[resolvedAssetGroup]
	const totalOpenInterest = sumMarketMetric(markets, 'openInterest')
	const totalVolume24h = sumMarketMetric(markets, 'volume24h')

	return {
		assetGroup: resolvedAssetGroup,
		markets: sortMarketsByOpenInterest(markets),
		initialChartDataset,
		assetGroupLinks: [
			{ label: 'All', to: '/rwa/perps/asset-groups' },
			...list.assetGroups.map((item) => ({ label: item, to: toAssetGroupDetailLink(item) }))
		],
		totals: {
			openInterest: totalOpenInterest,
			openInterestChange24h: getAggregateOpenInterestChange24h(markets),
			volume24h: totalVolume24h,
			volume24hChange24h: getAggregateVolume24hChange24h(markets),
			markets: safeNumber(statsBucket?.markets ?? markets.length),
			protocolFees24h: sumProtocolFees24h(markets)
		}
	}
}

export async function getRWAPerpsAssetGroupsOverview(): Promise<IRWAPerpsAssetGroupsOverview> {
	const stats = await fetchRWAPerpsStats()
	assertHasAssetGroupBuckets(stats)
	const initialChartDataset = await getRWAPerpsBreakdownChartDataset({
		breakdown: 'assetGroup',
		key: 'openInterest'
	})

	const rows: IRWAPerpsAssetGroupsOverviewRow[] = []
	for (const assetGroup in stats.byAssetGroup) {
		const bucket = stats.byAssetGroup[assetGroup]
		rows.push({
			assetGroup,
			openInterest: bucket.openInterest,
			openInterestShare: safeRatio(bucket.openInterest, stats.totalOpenInterest),
			volume24h: bucket.volume24h,
			volume24hShare: safeRatio(bucket.volume24h, stats.totalVolume24h),
			markets: bucket.markets
		})
	}

	return {
		rows: rows.sort((a, b) => b.openInterest - a.openInterest),
		initialChartDataset
	}
}
