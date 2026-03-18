import type { EquitiesPriceHistoryTimeframe } from './api.types'

export const EQUITIES_PRICE_HISTORY_TIMEFRAMES: readonly EquitiesPriceHistoryTimeframe[] = [
	'1W',
	'1M',
	'6M',
	'1Y',
	'5Y',
	'MAX'
]

export const TABS = ['overview', 'financials', 'filings'] as const
export const EQUITY_CHART_TYPES = ['Price History', 'Market Cap', 'Revenue'] as const
export const DEFAULT_EQUITY_CHART_TYPE = 'Price History'
export const DEFAULT_PRICE_HISTORY_TIMEFRAME: EquitiesPriceHistoryTimeframe = 'MAX'
export const EQUITY_CHART_QUERY_VALUES = {
	'Price History': 'price-history',
	'Market Cap': 'market-cap',
	Revenue: 'revenue'
} as const
