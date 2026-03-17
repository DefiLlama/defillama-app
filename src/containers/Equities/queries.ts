import type { MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import {
	fetchEquitiesCompanies,
	fetchEquitiesFilings,
	fetchEquitiesMetadata,
	fetchEquitiesPriceHistory,
	fetchEquitiesStatements,
	fetchEquitiesSummary
} from './api'
import type { IEquitiesListPageProps, IEquityTickerPageProps } from './types'

function normalizeTicker(ticker: string): string {
	return ticker.trim().toUpperCase()
}

function createTickerHref(ticker: string): string {
	return `/equities/${ticker.toLowerCase()}`
}

function toTimestamp(date: string): number {
	return new Date(`${date}T00:00:00Z`).getTime()
}

function buildPriceHistoryChart(
	priceHistory: Awaited<ReturnType<typeof fetchEquitiesPriceHistory>>
): IEquityTickerPageProps['priceHistoryChart'] {
	const source = [...priceHistory]
		.sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date))
		.map((point) => ({
			timestamp: toTimestamp(point.date),
			Close: point.price
		}))

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
		companies: sortedCompanies.map((company, index) => ({
			...company,
			rank: index + 1,
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
