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
	FILTER_PRESET: 'yields-filter-preset',
	// Saved Filters
	SAVED_FILTER_CREATE: 'yields-saved-filter-create',
	SAVED_FILTER_LOAD: 'yields-saved-filter-load',
	// Search (token search dialog)
	SEARCH_TOKEN_INCLUDE: 'yields-search-token-include',
	SEARCH_TOKEN_EXCLUDE: 'yields-search-token-exclude',
	SEARCH_TOKEN_EXACT: 'yields-search-token-exact',
	SEARCH_TOKEN_PAIR: 'yields-search-token-pair',
	// Search (strategy search)
	SEARCH_SELECT: 'yields-search-select',
	// Watchlist
	WATCHLIST_POOL_ADD: 'yields-watchlist-pool-add',
	// Table
	TABLE_SORT: 'yields-table-sort',
	// Pool
	POOL_CLICK: 'yields-pool-click',
	POOL_EXTERNAL_LINK: 'yields-pool-external-link',
	PROJECT_FILTER_CLICK: 'yields-project-filter-click',
	// Premium
	YIELD_SCORE_CLICK: 'yields-yield-score-click'
} as const

type YieldsEventName = (typeof YIELDS_EVENTS)[keyof typeof YIELDS_EVENTS]

export function trackYieldsEvent(eventName: YieldsEventName, data?: Record<string, string | number | boolean>): void {
	if (typeof window === 'undefined') return
	const maybeUmami = Reflect.get(window, 'umami')
	if (typeof maybeUmami !== 'object' || maybeUmami === null) return
	const maybeTrack = Reflect.get(maybeUmami, 'track')
	if (typeof maybeTrack !== 'function') return
	Reflect.apply(maybeTrack, maybeUmami, [eventName, data])
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
