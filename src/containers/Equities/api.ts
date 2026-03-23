import { EQUITIES_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	IEquitiesCompanyApiItem,
	IEquitiesFilingApiItem,
	IEquitiesMetadataResponse,
	EquitiesPriceHistory,
	EquitiesPriceHistoryTimeframe,
	IEquitiesStatementsResponse,
	IEquitiesSummaryResponse
} from './api.types'
import { DEFAULT_PRICE_HISTORY_TIMEFRAME } from './constants'

export const EQUITIES_COMPANIES_API = `${EQUITIES_SERVER_URL}/companies`
export const EQUITIES_STATEMENTS_API = `${EQUITIES_SERVER_URL}/statements`
export const EQUITIES_PRICE_HISTORY_API = `${EQUITIES_SERVER_URL}/price-history`
export const EQUITIES_SUMMARY_API = `${EQUITIES_SERVER_URL}/summary`
export const EQUITIES_METADATA_API = `${EQUITIES_SERVER_URL}/metadata`
export const EQUITIES_FILINGS_API = `${EQUITIES_SERVER_URL}/filings`

function createEquitiesUrl(
	baseUrl: string,
	params?: { ticker?: string; timeframe?: EquitiesPriceHistoryTimeframe }
): string {
	const url = new URL(baseUrl)

	if (params?.ticker) {
		url.searchParams.set('ticker', params.ticker)
	}

	if (params?.timeframe) {
		url.searchParams.set('timeframe', params.timeframe)
	}
	url.searchParams.set('q', '2')

	return url.toString()
}

/**
 * Fetch the live market summary for all companies.
 */
export async function fetchEquitiesCompanies(): Promise<IEquitiesCompanyApiItem[]> {
	return fetchJson<IEquitiesCompanyApiItem[]>(createEquitiesUrl(EQUITIES_COMPANIES_API))
}

/**
 * Fetch the normalized financial statements for a company ticker.
 */
export async function fetchEquitiesStatements(ticker: string): Promise<IEquitiesStatementsResponse> {
	return fetchJson<IEquitiesStatementsResponse>(createEquitiesUrl(EQUITIES_STATEMENTS_API, { ticker }))
}

/**
 * Fetch historical daily close prices for a company ticker.
 */
export async function fetchEquitiesPriceHistory(
	ticker: string,
	timeframe: EquitiesPriceHistoryTimeframe = DEFAULT_PRICE_HISTORY_TIMEFRAME
): Promise<EquitiesPriceHistory> {
	return fetchJson<EquitiesPriceHistory>(createEquitiesUrl(EQUITIES_PRICE_HISTORY_API, { ticker, timeframe }))
}

/**
 * Fetch the live market summary for a company ticker.
 */
export async function fetchEquitiesSummary(ticker: string): Promise<IEquitiesSummaryResponse> {
	return fetchJson<IEquitiesSummaryResponse>(createEquitiesUrl(EQUITIES_SUMMARY_API, { ticker }))
}

/**
 * Fetch metadata for a company ticker.
 */
export async function fetchEquitiesMetadata(ticker: string): Promise<IEquitiesMetadataResponse> {
	return fetchJson<IEquitiesMetadataResponse>(createEquitiesUrl(EQUITIES_METADATA_API, { ticker }))
}

/**
 * Fetch SEC filings for a company ticker.
 */
export async function fetchEquitiesFilings(ticker: string): Promise<IEquitiesFilingApiItem[]> {
	return fetchJson<IEquitiesFilingApiItem[]>(createEquitiesUrl(EQUITIES_FILINGS_API, { ticker }))
}
