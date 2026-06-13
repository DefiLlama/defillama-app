import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { toUnixMsTimestamp } from '~/containers/RWA/api'
import type {
	IRWAChartDataByAsset,
	IRWAChartMetricRows,
	RWAChartMetricKey,
	RWAAssetChartTarget
} from '~/containers/RWA/api.types'
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
