export const SELECTORS = {
	HOMEPAGE: {
		TOTAL_TVL: '[data-testid="total-tvl"]',
		CHAIN_OVERVIEW: '[data-testid="chain-overview"]',
		PROTOCOLS_TABLE: '[data-testid="protocols-table"]',
		PROTOCOL_ROW: '[data-testid="protocol-row"]',
		CHART_CONTAINER: '[data-testid="chart-container"]',
		HOMEPAGE_TITLE: '[data-testid="homepage-title"]',
		DEFI_METRICS: '[data-testid="defi-metrics"]'
	},
	SEARCH: {
		INPUT: '[data-testid="search-input"]',
		RESULTS: '[data-testid="search-results"]',
		RESULT_ITEM: '[data-testid="search-result-item"]',
		SEARCH_CONTAINER: '[data-testid="search-container"]',
		SEARCH_BUTTON: '[data-testid="search-button"]',
		SEARCH_CLOSE: '[data-testid="search-close"]'
	},
	CHAIN: {
		LINK: '[data-testid="chain-link"]',
		DROPDOWN: '[data-testid="chain-dropdown"]',
		FILTER: '[data-testid="chain-filter"]',
		NAME: '[data-testid="chain-name"]',
		TVL: '[data-testid="chain-tvl"]'
	},
	PROTOCOL: {
		NAME: '[data-testid="protocol-name"]',
		TVL: '[data-testid="protocol-tvl"]',
		CHANGE_1D: '[data-testid="protocol-change-1d"]',
		CHANGE_7D: '[data-testid="protocol-change-7d"]',
		LOGO: '[data-testid="protocol-logo"]',
		LINK: '[data-testid="protocol-link"]'
	},
	PROTOCOL_DETAIL: {
		HEADER: '[data-testid="protocol-detail-header"]',
		TITLE: '[data-testid="protocol-detail-title"]',
		TVL_VALUE: '[data-testid="protocol-detail-tvl"]',
		CHART: '[data-testid="protocol-detail-chart"]',
		DESCRIPTION: '[data-testid="protocol-description"]',
		WEBSITE_LINK: '[data-testid="protocol-website"]',
		AUDIT_LINK: '[data-testid="protocol-audit"]',
		CATEGORY: '[data-testid="protocol-category"]',
		CHAINS: '[data-testid="protocol-chains"]'
	},
	NAVIGATION: {
		HEADER: '[data-testid="main-header"]',
		LOGO: '[data-testid="defillama-logo"]',
		MENU: '[data-testid="nav-menu"]',
		MENU_ITEM: '[data-testid="nav-menu-item"]',
		MOBILE_MENU: '[data-testid="mobile-menu"]',
		MOBILE_MENU_TOGGLE: '[data-testid="mobile-menu-toggle"]'
	},
	CHART: {
		CONTAINER: '[data-testid="chart-container"]',
		LOADING: '[data-testid="chart-loading"]',
		TOOLTIP: '[data-testid="chart-tooltip"]',
		LEGEND: '[data-testid="chart-legend"]',
		TIME_FILTER: '[data-testid="chart-time-filter"]'
	},
	TABLE: {
		CONTAINER: '[data-testid="table-container"]',
		HEADER: '[data-testid="table-header"]',
		ROW: '[data-testid="table-row"]',
		CELL: '[data-testid="table-cell"]',
		SORT_BUTTON: '[data-testid="table-sort"]',
		PAGINATION: '[data-testid="table-pagination"]'
	},
	ONBOARDING: {
		MODAL: '[data-testid="onboarding-modal"]',
		CLOSE_BUTTON: '[data-testid="close-onboarding"]',
		NEXT_BUTTON: '[data-testid="onboarding-next"]',
		SKIP_BUTTON: '[data-testid="onboarding-skip"]',
		STEP_INDICATOR: '[data-testid="onboarding-step"]'
	},
	LOADING: {
		SPINNER: '[data-testid="loading-spinner"]',
		SKELETON: '[data-testid="loading-skeleton"]',
		PAGE_LOADING: '[data-testid="page-loading"]'
	},
	ERROR: {
		MESSAGE: '[data-testid="error-message"]',
		RETRY_BUTTON: '[data-testid="error-retry"]',
		NOT_FOUND: '[data-testid="not-found"]'
	},
	FILTERS: {
		CONTAINER: '[data-testid="filters-container"]',
		CATEGORY: '[data-testid="category-filter"]',
		CHAIN: '[data-testid="chain-filter"]',
		TVL_RANGE: '[data-testid="tvl-range-filter"]',
		RESET: '[data-testid="reset-filters"]'
	},
	METRICS: {
		CONTAINER: '[data-testid="metrics-container"]',
		TOTAL_TVL: '[data-testid="total-tvl"]',
		CHANGE_24H: '[data-testid="change-24h"]',
		DOMINANCE: '[data-testid="dominance"]',
		PROTOCOLS_COUNT: '[data-testid="protocols-count"]'
	}
} as const

export const createSelector = (baseSelector: string, identifier: string) => {
	return `${baseSelector}[data-identifier="${identifier}"]`
}

export const createNthSelector = (baseSelector: string, position: number) => {
	return `${baseSelector}:nth-child(${position})`
}
