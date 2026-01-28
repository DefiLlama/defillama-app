export const YIELDS_EVENTS = {
	// Filters
	FILTER_CHAIN: 'yields-filter-chain',
	FILTER_PROJECT: 'yields-filter-project',
	FILTER_CATEGORY: 'yields-filter-category',
	FILTER_TOKEN: 'yields-filter-token',
	FILTER_ATTRIBUTE: 'yields-filter-attribute',
	FILTER_TVL_RANGE: 'yields-filter-tvl-range',
	FILTER_APY_RANGE: 'yields-filter-apy-range',
	FILTER_COLUMN: 'yields-filter-column',
	FILTER_RESET: 'yields-filter-reset',
	// Saved Filters
	SAVED_FILTER_CREATE: 'yields-saved-filter-create',
	SAVED_FILTER_LOAD: 'yields-saved-filter-load',
	SAVED_FILTER_DELETE: 'yields-saved-filter-delete',
	// Search (token search dialog)
	SEARCH_TOKEN_INCLUDE: 'yields-search-token-include',
	SEARCH_TOKEN_EXCLUDE: 'yields-search-token-exclude',
	SEARCH_TOKEN_EXACT: 'yields-search-token-exact',
	SEARCH_TOKEN_PAIR: 'yields-search-token-pair',
	// Search (strategy search)
	SEARCH_SELECT: 'yields-search-select',
	SEARCH_SEE_MORE: 'yields-search-see-more',
	// Watchlist
	WATCHLIST_PORTFOLIO_CREATE: 'yields-watchlist-portfolio-create',
	WATCHLIST_PORTFOLIO_DELETE: 'yields-watchlist-portfolio-delete',
	WATCHLIST_PORTFOLIO_SWITCH: 'yields-watchlist-portfolio-switch',
	WATCHLIST_POOL_ADD: 'yields-watchlist-pool-add',
	WATCHLIST_POOL_REMOVE: 'yields-watchlist-pool-remove',
	// Table
	TABLE_SORT: 'yields-table-sort',
	POOL_CLICK: 'yields-pool-click',
	POOL_EXTERNAL_LINK: 'yields-pool-external-link',
	PROJECT_FILTER_CLICK: 'yields-project-filter-click'
} as const

export type YieldsEventName = (typeof YIELDS_EVENTS)[keyof typeof YIELDS_EVENTS]

export function trackYieldsEvent(eventName: YieldsEventName, data?: Record<string, string | number | boolean>): void {
	if (typeof window !== 'undefined' && (window as any).umami) {
		;(window as any).umami.track(eventName, data)
	}
}

// Debounced version for range inputs
let debounceTimer: ReturnType<typeof setTimeout> | null = null
export function trackYieldsEventDebounced(
	eventName: YieldsEventName,
	data?: Record<string, string | number | boolean>,
	delay = 1000
): void {
	if (debounceTimer) clearTimeout(debounceTimer)
	debounceTimer = setTimeout(() => trackYieldsEvent(eventName, data), delay)
}
