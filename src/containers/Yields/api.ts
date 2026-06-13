import { fetchJson } from '~/utils/async'
import type {
	YieldChainsResponse,
	YieldConfigResponse,
	YieldFetchOptions,
	YieldLendBorrowResponse,
	YieldMedianResponse,
	YieldPerpsResponse,
	YieldPoolsResponse,
	YieldTokenCategoriesResponse,
	YieldUrlsResponse
} from './api.types'
import {
	YIELD_TOKEN_CATEGORIES_API,
	YIELD_CHAIN_API,
	YIELD_CONFIG_API,
	YIELD_LEND_BORROW_API,
	YIELD_MEDIAN_API,
	YIELD_PERPS_API,
	YIELD_POOLS_API,
	YIELD_URL_API
} from './constants'

const fetchYieldJson = <T>(url: string, options: YieldFetchOptions = {}) =>
	fetchJson<T>(url, options.timeout != null ? { timeout: options.timeout } : undefined)

export function fetchYieldPoolsApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldPoolsResponse>(YIELD_POOLS_API, options)
}

export function fetchYieldConfigApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldConfigResponse>(YIELD_CONFIG_API, options)
}

export function fetchYieldUrlsApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldUrlsResponse>(YIELD_URL_API, options)
}

export function fetchYieldChainsApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldChainsResponse>(YIELD_CHAIN_API, options)
}

export function fetchYieldMedianApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldMedianResponse>(YIELD_MEDIAN_API, options)
}

export function fetchYieldLendBorrowApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldLendBorrowResponse>(YIELD_LEND_BORROW_API, options)
}

export function fetchYieldPerpsApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldPerpsResponse>(YIELD_PERPS_API, options)
}

export function fetchYieldTokenCategoriesApi(options?: YieldFetchOptions) {
	return fetchYieldJson<YieldTokenCategoriesResponse>(YIELD_TOKEN_CATEGORIES_API, options)
}
