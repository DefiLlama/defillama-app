import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import type {
	IEquitiesCompanyApiItem,
	IEquitiesFilingApiItem,
	IEquitiesMetadataResponse,
	IEquitiesStatementsResponse,
	IEquitiesSummaryResponse
} from './api.types'

export interface IEquitiesPriceHistoryChart {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
}

export interface IEquitiesListCompanyRow extends IEquitiesCompanyApiItem {
	rank: number
	href: string
}

export interface IEquitiesListPageProps {
	companies: IEquitiesListCompanyRow[]
	lastUpdatedAt?: string
}

export interface IEquitiesStatementTableRow {
	id: string
	label: string
	values: Array<number | null>
	depth: number
	subRows?: IEquitiesStatementTableRow[]
}

export interface IEquityTickerPageProps {
	ticker: string
	name: string
	metadata: IEquitiesMetadataResponse
	summary: IEquitiesSummaryResponse
	priceHistoryChart: IEquitiesPriceHistoryChart
	statements: IEquitiesStatementsResponse
	filings: IEquitiesFilingApiItem[]
	filingForms: string[]
}
