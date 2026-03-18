export interface IEquitiesCompanyApiItem {
	ticker: string
	name: string
	currentPrice: number | null
	volume: number | null
	marketCap: number | null
	priceChangePercentage: number | null
	lastUpdatedAt?: string
}

export interface IEquitiesSummaryResponse {
	currentPrice: number | null
	volume: number | null
	marketCap: number | null
	fiftyTwoWeekHigh: number | null
	fiftyTwoWeekLow: number | null
	dividendYield: number | null
	trailingPE: number | null
	priceChangePercentage: number | null
	updatedAt?: string
}

export interface IEquitiesMetadataResponse {
	ticker: string
	name: string
	website?: string
	industry?: string
	cik: string
	startDate?: string
}

export type EquitiesPriceHistoryTimeframe = '1W' | '1M' | '6M' | '1Y' | '5Y' | 'MAX'

export type EquitiesPriceHistory = Array<[number, number]>

export interface IEquitiesFilingApiItem {
	filingDate: string
	reportDate: string
	form: string
	primaryDocumentUrl: string
	documentDescription: string
}

interface IEquitiesStatementPeriodData {
	periods: string[]
	periodEnding: string[]
	values: Array<Array<number | null>>
	children: Record<string, { values: Array<Array<number | null>> }>
}

interface IEquitiesStatementSection {
	labels: string[]
	children: {
		quarterly: Record<string, { labels: string[] }>
		annual: Record<string, { labels: string[] }>
	}
	quarterly: IEquitiesStatementPeriodData
	annual: IEquitiesStatementPeriodData
}

export interface IEquitiesStatementsResponse {
	incomeStatement: IEquitiesStatementSection
	balanceSheet: IEquitiesStatementSection
	cashflow: IEquitiesStatementSection
}
