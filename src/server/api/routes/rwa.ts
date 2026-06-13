import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import {
	fetchRWAAssetGroupBreakdownChartData,
	fetchRWACategoryBreakdownChartData,
	fetchRWAChainBreakdownChartData,
	fetchRWAPlatformBreakdownChartData,
	toUnixMsTimestamp
} from '~/containers/RWA/api'
import type {
	IRWAChartDataByAsset,
	IRWAChartMetricRows,
	RWAChartMetricKey,
	RWAAssetChartTarget,
	RWAOverviewBreakdownRequest
} from '~/containers/RWA/api.types'
import { toOverviewBreakdownChartDataset } from '~/containers/RWA/breakdownDataset'
import { fetchRWAPerpsContractBreakdownChartData, fetchRWAPerpsOverviewBreakdownChartData } from '~/containers/RWA/Perps/api'
import { toRWAPerpsBreakdownChartDataset } from '~/containers/RWA/Perps/breakdownDataset'
import {
	parseChartMetricKey as parsePerpsChartMetricKey,
	parseOptionalTarget
} from '~/containers/RWA/Perps/requestParsers'
import type { IRWAPerpsContractBreakdownRequest, IRWAPerpsOverviewBreakdownRequest } from '~/containers/RWA/Perps/types'
import {
	hasExactlyOneTarget,
	parseBooleanQueryFlag,
	parseEnumQueryValue,
	parseOptionalStringTarget
} from '~/containers/RWA/requestParsers'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { notFound, ok, badRequest, upstreamError } from '../respond'
import { cachedResult } from '../resultCache'
import type { ApiQuery } from '../types'
import { defineApiRoute } from '../types'

type RWAAssetBreakdownRequest = {
	target: RWAAssetChartTarget
	key: RWAChartMetricKey
	includeStablecoin: boolean
	includeGovernance: boolean
}

const RWA_CHART_METRIC_KEYS = ['onChainMcap', 'activeMcap', 'defiActiveTvl'] as const

export function buildAssetBreakdownUrl(request: RWAAssetBreakdownRequest): string {
	let pathname: string

	switch (request.target.kind) {
		case 'all':
			pathname = `${RWA_SERVER_URL}/chart/chain/all/asset-breakdown`
			break
		case 'chain':
			pathname = `${RWA_SERVER_URL}/chart/chain/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'category':
			pathname = `${RWA_SERVER_URL}/chart/category/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'platform':
			pathname = `${RWA_SERVER_URL}/chart/platform/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'assetGroup':
			pathname = `${RWA_SERVER_URL}/chart/assetGroup/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		default:
			return assertNever(request.target)
	}

	const searchParams = new URLSearchParams({
		includeStablecoin: String(request.includeStablecoin),
		includeGovernance: String(request.includeGovernance)
	})

	return `${pathname}?${searchParams.toString()}`
}

export function normalizeAssetBreakdownRows(rows: IRWAChartMetricRows): IRWAChartMetricRows {
	return ensureChronologicalRows((rows ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) })))
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

function parseChartMetricKey(value: string | string[] | undefined): RWAChartMetricKey | null {
	return parseEnumQueryValue(value, RWA_CHART_METRIC_KEYS)
}

function parseTarget(query: ApiQuery): RWAAssetChartTarget | null {
	const chain = parseOptionalStringTarget(query.chain)
	const category = parseOptionalStringTarget(query.category)
	const platform = parseOptionalStringTarget(query.platform)
	const assetGroup = parseOptionalStringTarget(query.assetGroup)

	if (chain === null || category === null || platform === null || assetGroup === null) return null
	if (!hasExactlyOneTarget([chain, category, platform, assetGroup])) {
		return chain || category || platform || assetGroup ? null : { kind: 'all' }
	}
	if (chain) return { kind: 'chain', slug: chain }
	if (category) return { kind: 'category', slug: category }
	if (platform) return { kind: 'platform', slug: platform }
	return { kind: 'assetGroup', slug: assetGroup! }
}

export function parseAssetBreakdownRequest(req: { query: ApiQuery }): RWAAssetBreakdownRequest | null {
	const target = parseTarget(req.query)
	const key = parseChartMetricKey(req.query.key)
	const includeStablecoin = parseBooleanQueryFlag(req.query.includeStablecoin)
	const includeGovernance = parseBooleanQueryFlag(req.query.includeGovernance)

	if (target == null || key == null || includeStablecoin == null || includeGovernance == null) {
		return null
	}

	return {
		target,
		key,
		includeStablecoin,
		includeGovernance
	}
}

async function isKnownAssetBreakdownTarget(target: RWAAssetChartTarget): Promise<boolean> {
	if (target.kind === 'all') return true

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const targetSlug = rwaSlug(target.slug)
	const values =
		target.kind === 'chain'
			? rwaList.chains
			: target.kind === 'category'
				? rwaList.categories
				: target.kind === 'platform'
					? rwaList.platforms
					: rwaList.assetGroups

	for (const value of values) {
		if (rwaSlug(value) === targetSlug) return true
	}

	return false
}

function buildAssetBreakdownCacheKey(request: RWAAssetBreakdownRequest): string {
	const searchParams = new URLSearchParams({
		target: request.target.kind === 'all' ? 'all' : `${request.target.kind}:${rwaSlug(request.target.slug)}`,
		key: request.key,
		includeStablecoin: String(request.includeStablecoin),
		includeGovernance: String(request.includeGovernance)
	})
	return `/api/public/rwa/asset-breakdown?${searchParams.toString()}`
}

const RWA_BREAKDOWN_RESULT_TTL_MS = 30 * 60 * 1000
const RWA_BREAKDOWN_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=1800'

const RWA_OVERVIEW_BREAKDOWNS = ['chain', 'category', 'platform', 'assetGroup'] as const

export function parseRWAOverviewBreakdownRequest(req: { query: ApiQuery }): RWAOverviewBreakdownRequest | null {
	const breakdown = parseEnumQueryValue(req.query.breakdown, RWA_OVERVIEW_BREAKDOWNS)
	const key = parseChartMetricKey(req.query.key)
	if (breakdown == null || key == null) return null

	const includeStablecoin = parseBooleanQueryFlag(req.query.includeStablecoin, false)
	const includeGovernance = parseBooleanQueryFlag(req.query.includeGovernance, false)
	if (includeStablecoin == null || includeGovernance == null) return null

	if (breakdown === 'chain') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'category') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'platform') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'assetGroup') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	return null
}

function fetchOverviewBreakdownRows(request: RWAOverviewBreakdownRequest) {
	switch (request.breakdown) {
		case 'chain':
			return fetchRWAChainBreakdownChartData(request)
		case 'category':
			return fetchRWACategoryBreakdownChartData(request)
		case 'platform':
			return fetchRWAPlatformBreakdownChartData(request)
		case 'assetGroup':
			return fetchRWAAssetGroupBreakdownChartData(request)
		default:
			return assertNever(request)
	}
}

function buildOverviewBreakdownCacheKey(request: RWAOverviewBreakdownRequest): string {
	const searchParams = new URLSearchParams({
		breakdown: request.breakdown,
		key: request.key,
		includeStablecoin: String(request.includeStablecoin),
		includeGovernance: String(request.includeGovernance)
	})
	return `/api/public/rwa/overview-breakdown?${searchParams.toString()}`
}

export const rwaOverviewBreakdown = defineApiRoute({
	route: '/api/public/rwa/overview-breakdown',
	cacheControl: RWA_BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const request = parseRWAOverviewBreakdownRequest(req)

		if (request == null) {
			return badRequest('Invalid query parameters')
		}

		try {
			const dataset = await cachedResult(
				'rwa-overview-breakdown',
				buildOverviewBreakdownCacheKey(request),
				{ ttlMs: RWA_BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				async () => {
					const rows = await fetchOverviewBreakdownRows(request)
					if (rows == null) {
						throw new Error('RWA overview breakdown upstream returned no data')
					}
					return toOverviewBreakdownChartDataset(rows, request)
				}
			)
			return ok(dataset)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch upstream chart data')
		}
	}
})

async function hasKnownPerpsTarget(request: { venue?: string; assetGroup?: string }): Promise<boolean> {
	if (!request.venue && !request.assetGroup) return true

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	if (request.venue) {
		const requestSlug = rwaSlug(request.venue)
		for (const venue of metadataCache.rwaPerpsList.venues) {
			if (rwaSlug(venue) === requestSlug) return true
		}
		return false
	}

	if (request.assetGroup) {
		const requestSlug = rwaSlug(request.assetGroup)
		for (const assetGroup of metadataCache.rwaPerpsList.assetGroups) {
			if (rwaSlug(assetGroup) === requestSlug) return true
		}
		return false
	}

	return true
}

type ParsedPerpsOverviewBreakdownRequest = IRWAPerpsOverviewBreakdownRequest & {
	venue?: string
	assetGroup?: string
	assetClass?: string
	excludeAssetClass?: string
}

const RWA_PERPS_OVERVIEW_BREAKDOWNS = ['venue', 'assetClass', 'assetGroup', 'baseAsset'] as const

export function parsePerpsOverviewBreakdownRequest(req: {
	query: ApiQuery
}): ParsedPerpsOverviewBreakdownRequest | null {
	const breakdown = parseEnumQueryValue(req.query.breakdown, RWA_PERPS_OVERVIEW_BREAKDOWNS)
	const key = parsePerpsChartMetricKey(req.query.key)
	if (breakdown == null || key == null) return null

	const venue = parseOptionalTarget(req.query.venue)
	const assetGroup = parseOptionalTarget(req.query.assetGroup)
	const assetClass = parseOptionalTarget(req.query.assetClass)
	const excludeAssetClass = parseOptionalTarget(req.query.excludeAssetClass)
	if (venue === null || assetGroup === null || assetClass === null || excludeAssetClass === null) return null
	if (!hasExactlyOneTarget([venue, assetGroup, assetClass, excludeAssetClass])) {
		if (venue || assetGroup || assetClass || excludeAssetClass) return null
	}

	return {
		breakdown,
		key,
		...(venue ? { venue } : {}),
		...(assetGroup ? { assetGroup } : {}),
		...(assetClass ? { assetClass } : {}),
		...(excludeAssetClass ? { excludeAssetClass } : {})
	}
}

function buildPerpsOverviewBreakdownCacheKey(request: ParsedPerpsOverviewBreakdownRequest): string {
	const searchParams = new URLSearchParams({ breakdown: request.breakdown, key: request.key })
	if (request.venue) searchParams.set('venue', request.venue)
	if (request.assetGroup) searchParams.set('assetGroup', request.assetGroup)
	if (request.assetClass) searchParams.set('assetClass', request.assetClass)
	if (request.excludeAssetClass) searchParams.set('excludeAssetClass', request.excludeAssetClass)
	return `/api/public/rwa/perps/overview-breakdown?${searchParams.toString()}`
}

export const rwaPerpsOverviewBreakdown = defineApiRoute({
	route: '/api/public/rwa/perps/overview-breakdown',
	cacheControl: RWA_BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const request = parsePerpsOverviewBreakdownRequest(req)

		if (request == null) {
			return badRequest('Invalid query parameters')
		}

		try {
			if (!(await hasKnownPerpsTarget(request))) {
				return notFound('RWA perps target not found')
			}

			const dataset = await cachedResult(
				'rwa-perps-overview-breakdown',
				buildPerpsOverviewBreakdownCacheKey(request),
				{ ttlMs: RWA_BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				async () => {
					const rows = await fetchRWAPerpsOverviewBreakdownChartData(request)
					if (rows == null) {
						throw new Error('RWA perps overview breakdown upstream returned no data')
					}
					return toRWAPerpsBreakdownChartDataset(rows)
				}
			)
			return ok(dataset)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch upstream chart data')
		}
	}
})

export function parsePerpsContractBreakdownRequest(req: { query: ApiQuery }): IRWAPerpsContractBreakdownRequest | null {
	const key = parsePerpsChartMetricKey(req.query.key)
	if (key == null) return null

	const venue = parseOptionalTarget(req.query.venue)
	const assetGroup = parseOptionalTarget(req.query.assetGroup)
	const assetClass = parseOptionalTarget(req.query.assetClass)
	const excludeAssetClass = parseOptionalTarget(req.query.excludeAssetClass)
	if (venue === null || assetGroup === null || assetClass === null || excludeAssetClass === null) return null
	if (!hasExactlyOneTarget([venue, assetGroup, assetClass, excludeAssetClass])) {
		if (venue || assetGroup || assetClass || excludeAssetClass) return null
	}

	return {
		key,
		...(venue ? { venue } : {}),
		...(assetGroup ? { assetGroup } : {}),
		...(assetClass ? { assetClass } : {}),
		...(excludeAssetClass ? { excludeAssetClass } : {})
	}
}

function buildPerpsContractBreakdownCacheKey(request: IRWAPerpsContractBreakdownRequest): string {
	const searchParams = new URLSearchParams({ key: request.key })
	if (request.venue) searchParams.set('venue', request.venue)
	if (request.assetGroup) searchParams.set('assetGroup', request.assetGroup)
	if (request.assetClass) searchParams.set('assetClass', request.assetClass)
	if (request.excludeAssetClass) searchParams.set('excludeAssetClass', request.excludeAssetClass)
	return `/api/public/rwa/perps/contract-breakdown?${searchParams.toString()}`
}

export const rwaPerpsContractBreakdown = defineApiRoute({
	route: '/api/public/rwa/perps/contract-breakdown',
	cacheControl: RWA_BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const request = parsePerpsContractBreakdownRequest(req)

		if (request == null) {
			return badRequest('Invalid query parameters')
		}

		try {
			if (!(await hasKnownPerpsTarget(request))) {
				return notFound('RWA perps target not found')
			}

			const dataset = await cachedResult(
				'rwa-perps-contract-breakdown',
				buildPerpsContractBreakdownCacheKey(request),
				{ ttlMs: RWA_BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				async () => {
					const rows = await fetchRWAPerpsContractBreakdownChartData(request)
					if (rows == null) {
						throw new Error('RWA perps contract breakdown upstream returned no data')
					}
					return toRWAPerpsBreakdownChartDataset(rows)
				}
			)
			return ok(dataset)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch upstream chart data')
		}
	}
})

export const rwaAssetBreakdown = defineApiRoute({
	route: '/api/public/rwa/asset-breakdown',
	cacheControl: 'public, s-maxage=3600, stale-while-revalidate=1800',
	handle: async (req) => {
		const request = parseAssetBreakdownRequest(req)

		if (request == null) {
			return badRequest('Invalid query parameters')
		}

		try {
			if (!(await isKnownAssetBreakdownTarget(request.target))) {
				return notFound('RWA target not found')
			}

			const cacheKey = buildAssetBreakdownCacheKey(request)
			const rows = await cachedResult(
				'rwa-asset-breakdown',
				cacheKey,
				{ ttlMs: 30 * 60 * 1000, ttlJitter: 0.2 },
				async () => {
					const raw = await fetchJson<IRWAChartDataByAsset>(buildAssetBreakdownUrl(request), {
						timeout: 30_000
					})
					return normalizeAssetBreakdownRows(raw[request.key] ?? [])
				}
			)
			return ok(rows)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch upstream chart data')
		}
	}
})
