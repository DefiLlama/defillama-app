import type { MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import {
	fetchEquitiesCompanies,
	fetchEquitiesFilings,
	fetchEquitiesMetadata,
	fetchEquitiesPriceHistory,
	fetchEquitiesStatements,
	fetchEquitiesSummary
} from './api'
import type { EquitiesPriceHistory } from './api.types'
import type { IEquitiesListPageProps, IEquitiesPriceChanges, IEquityTickerPageProps } from './types'

const MS_PER_DAY = 86_400_000

function toMs(dateStr: string): number {
	return new Date(dateStr).getTime()
}

function computePriceChangeForPeriod(sorted: EquitiesPriceHistory, periodMs: number): number | null {
	if (sorted.length < 2) return null

	const latest = sorted[sorted.length - 1]
	const latestMs = toMs(latest[0])
	const targetMs = latestMs - periodMs

	let closest = sorted[0]
	let closestDiff = Math.abs(toMs(closest[0]) - targetMs)

	for (const point of sorted) {
		const diff = Math.abs(toMs(point[0]) - targetMs)
		if (diff < closestDiff) {
			closest = point
			closestDiff = diff
		}
	}

	if (closest[0] === latest[0] || closest[1] === 0) return null
	return ((latest[1] - closest[1]) / closest[1]) * 100
}

export function computePriceChanges(priceHistory: EquitiesPriceHistory): IEquitiesPriceChanges {
	const sorted = [...priceHistory].sort((a, b) => toMs(a[0]) - toMs(b[0]))

	return {
		twentyFourHour: computePriceChangeForPeriod(sorted, MS_PER_DAY),
		sevenDay: computePriceChangeForPeriod(sorted, 7 * MS_PER_DAY),
		thirtyDay: computePriceChangeForPeriod(sorted, 30 * MS_PER_DAY)
	}
}

function normalizeTicker(ticker: string): string {
	return ticker.trim().toUpperCase()
}

function createTickerHref(ticker: string): string {
	return `/equities/${ticker.toLowerCase()}`
}

export function buildPriceHistoryChart(
	priceHistory: Awaited<ReturnType<typeof fetchEquitiesPriceHistory>>
): IEquityTickerPageProps['priceHistoryChart'] {
	const source = priceHistory
		.map((point) => ({
			timestamp: new Date(point[0]).getTime(),
			Close: point[1]
		}))
		.sort((a, b) => a.timestamp - b.timestamp)

	const charts: MultiSeriesChart2SeriesConfig[] = [
		{
			type: 'line',
			name: 'Close',
			encode: { x: 'timestamp', y: 'Close' }
		}
	]

	return {
		dataset: {
			source,
			dimensions: ['timestamp', 'Close']
		},
		charts
	}
}

export async function getEquitiesListPageData(): Promise<IEquitiesListPageProps> {
	const companies = await fetchEquitiesCompanies()
	const sortedCompanies = [...companies].sort((a, b) => {
		const aMarketCap = a.marketCap ?? -1
		const bMarketCap = b.marketCap ?? -1
		return bMarketCap - aMarketCap
	})

	return {
		companies: sortedCompanies.map((company) => ({
			...company,
			href: createTickerHref(company.ticker)
		})),
		lastUpdatedAt: sortedCompanies.find((company) => company.lastUpdatedAt)?.lastUpdatedAt
	}
}

export async function getEquitiesTickerPageData(rawTicker: string): Promise<IEquityTickerPageProps | null> {
	const ticker = normalizeTicker(rawTicker)

	const [summary, metadata, priceHistory, statements, filings] = await Promise.all([
		fetchEquitiesSummary(ticker),
		fetchEquitiesMetadata(ticker),
		fetchEquitiesPriceHistory(ticker).catch(() => []),
		fetchEquitiesStatements(ticker).catch(() => null),
		fetchEquitiesFilings(ticker).catch(() => [])
	])

	if (!summary || !metadata || !statements || !metadata.ticker || !metadata.name) {
		return null
	}

	return {
		ticker: normalizeTicker(metadata.ticker),
		name: metadata.name,
		metadata,
		summary,
		priceHistoryChart: buildPriceHistoryChart(priceHistory),
		priceChanges: computePriceChanges(priceHistory),
		statements,
		filings,
		filingForms: Array.from(new Set(filings.map((filing) => filing.form))).sort((a, b) => a.localeCompare(b))
	}
}

export async function getEquitiesTickerPaths(limit = 50): Promise<string[]> {
	const companies = await fetchEquitiesCompanies().catch(() => [])
	const sortedCompanies = [...companies].sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1))
	return sortedCompanies
		.slice(0, limit)
		.map((company) => company.ticker?.toLowerCase())
		.filter((ticker): ticker is string => Boolean(ticker))
}
