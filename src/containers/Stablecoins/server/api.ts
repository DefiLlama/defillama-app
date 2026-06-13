import {
	fetchStablecoinChainVolumeChartApi,
	fetchStablecoinChartApi,
	fetchStablecoinTokenVolumeChartApi,
	fetchStablecoinVolumeChartApi
} from '~/containers/Stablecoins/api'
import type {
	StablecoinVolumeChainChartKind,
	StablecoinVolumeChartResponse,
	StablecoinVolumeGlobalChartKind,
	StablecoinVolumeTokenChartKind
} from '~/containers/Stablecoins/api.types'
import {
	STABLECOIN_CHART_CACHE_CONTROL,
	type StablecoinAssetChartType,
	type StablecoinChainsChartType,
	type StablecoinOverviewChartType
} from '~/containers/Stablecoins/chartSeries'
import {
	getStablecoinAssetChartSeries,
	getStablecoinChainsChartSeries,
	getStablecoinOverviewChartSeries
} from '~/containers/Stablecoins/queries.server'
import { getPrevStablecoinTotalFromChart } from '~/containers/Stablecoins/utils'
import { buildStablecoinVolumeChartPayload } from '~/containers/Stablecoins/volumeChart'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute, type ApiResult } from '~/server/api/types'
import { isTruthyQueryParam } from '~/utils/routerQuery'
import { recordRouteRuntimeError } from '~/utils/telemetry'

type StablecoinMcapSeriesPoint = [number, number]

// These two routes' legacy 405 body (`Method Not Allowed`) is pinned by their
// route tests, so the guard lives in the handler instead of the adapter.
const LEGACY_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function legacyMethodNotAllowed(): ApiResult {
	return { status: 405, body: { error: 'Method Not Allowed' }, headers: { Allow: 'GET' } }
}

// ---------------------------------------------------------------------------
// /api/public/stablecoins/chart
// ---------------------------------------------------------------------------

function buildStablecoinMcapSeries(
	aggregated: Awaited<ReturnType<typeof fetchStablecoinChartApi>>['aggregated']
): StablecoinMcapSeriesPoint[] {
	return (aggregated ?? [])
		.map((point): StablecoinMcapSeriesPoint | null => {
			const timestamp = Number(point.date) * 1e3
			const mcap = getPrevStablecoinTotalFromChart([point], 0, 'totalCirculatingUSD')
			if (!Number.isFinite(timestamp) || !Number.isFinite(mcap)) return null
			return [timestamp, mcap]
		})
		.filter((point): point is StablecoinMcapSeriesPoint => point !== null)
		.sort((a, b) => a[0] - b[0])
}

export const stablecoinMcapChart = defineApiRoute({
	route: '/api/public/stablecoins/chart',
	cacheControl: 'public, max-age=300',
	handle: async (req) => {
		const chain = queryString(req.query, 'chain')
		if (!chain) {
			return badRequest('chain parameter is required')
		}

		try {
			// The legacy stablecoin chart API uses this special label for the global
			// aggregate instead of accepting "all" directly.
			const chainLabel = chain.toLowerCase() === 'all' ? 'all-llama-app' : chain
			const data = await fetchStablecoinChartApi(chainLabel)

			return ok(buildStablecoinMcapSeries(data.aggregated))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch stablecoin chart')
		}
	}
})

// ---------------------------------------------------------------------------
// /api/public/stablecoins/chart-series
// ---------------------------------------------------------------------------

const OVERVIEW_CHARTS = new Set<StablecoinOverviewChartType>([
	'totalMcap',
	'tokenMcaps',
	'dominance',
	'usdInflows',
	'tokenInflows'
])
const CHAINS_CHARTS = new Set<StablecoinChainsChartType>(['totalMcap', 'chainMcaps', 'dominance'])
const ASSET_CHARTS = new Set<StablecoinAssetChartType>(['totalCirc', 'chainMcaps', 'chainDominance'])

export const stablecoinChartSeries = defineApiRoute({
	route: '/api/public/stablecoins/chart-series',
	methods: LEGACY_METHODS,
	cacheControl: STABLECOIN_CHART_CACHE_CONTROL,
	handle: async (req) => {
		if (req.method !== 'GET') {
			return legacyMethodNotAllowed()
		}

		const scope = queryString(req.query, 'scope')
		const rawChart = queryString(req.query, 'chart')
		if (!scope || !rawChart) {
			return badRequest('scope and chart parameters are required')
		}

		try {
			if (scope === 'overview') {
				if (!OVERVIEW_CHARTS.has(rawChart as StablecoinOverviewChartType)) {
					return badRequest('unsupported overview chart')
				}
				const chain = queryString(req.query, 'chain')
				if (!chain) return badRequest('chain parameter is required')
				const [{ default: metadataCache }, { resolveChainParamFromMetadata }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/chains')
				])
				const isAllChain = chain.toLowerCase() === 'all'
				const chainRoute = isAllChain ? null : resolveChainParamFromMetadata(chain, metadataCache)
				if (!isAllChain && !chainRoute) return notFound('chain not found')
				const payload = await getStablecoinOverviewChartSeries({
					chain: isAllChain ? null : chainRoute.canonicalName,
					chart: rawChart as StablecoinOverviewChartType,
					filters: {
						attribute: req.query.attribute,
						excludeAttribute: req.query.excludeAttribute,
						pegtype: req.query.pegtype,
						excludePegtype: req.query.excludePegtype,
						backing: req.query.backing,
						excludeBacking: req.query.excludeBacking,
						minMcap: req.query.minMcap,
						maxMcap: req.query.maxMcap
					}
				})
				return ok(payload)
			}

			if (scope === 'chains') {
				if (!CHAINS_CHARTS.has(rawChart as StablecoinChainsChartType)) {
					return badRequest('unsupported chains chart')
				}
				const payload = await getStablecoinChainsChartSeries(
					rawChart as StablecoinChainsChartType,
					isTruthyQueryParam(req.query.unreleased)
				)
				return ok(payload)
			}

			if (scope === 'asset') {
				if (!ASSET_CHARTS.has(rawChart as StablecoinAssetChartType)) {
					return badRequest('unsupported asset chart')
				}
				const stablecoin = queryString(req.query, 'stablecoin')
				if (!stablecoin) return badRequest('stablecoin parameter is required')
				const [{ default: metadataCache }, { resolveStablecoinAssetParamFromMetadata }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/assets')
				])
				const stablecoinSlug = resolveStablecoinAssetParamFromMetadata(stablecoin, metadataCache)
				if (!stablecoinSlug) return notFound('stablecoin not found')
				const payload = await getStablecoinAssetChartSeries({
					peggedasset: stablecoinSlug,
					chart: rawChart as StablecoinAssetChartType,
					includeUnreleased: isTruthyQueryParam(req.query.unreleased)
				})
				if (!payload) return notFound('stablecoin not found')
				return ok(payload)
			}

			return badRequest('unsupported scope')
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch stablecoin chart series')
		}
	}
})

// ---------------------------------------------------------------------------
// /api/public/stablecoins/volume-chart
// ---------------------------------------------------------------------------

const GLOBAL_CHARTS = new Set<StablecoinVolumeGlobalChartKind>(['total', 'chain', 'token', 'currency'])
const CHAIN_CHARTS = new Set<StablecoinVolumeChainChartKind>(['total', 'token', 'currency'])
const TOKEN_CHARTS = new Set<StablecoinVolumeTokenChartKind>(['total', 'chain'])

const parseLimit = (value: string | string[] | undefined): number | undefined => {
	const raw = Array.isArray(value) ? value[0] : value
	if (!raw) return undefined
	const parsed = Math.trunc(Number(raw))
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export const stablecoinVolumeChart = defineApiRoute({
	route: '/api/public/stablecoins/volume-chart',
	methods: LEGACY_METHODS,
	cacheControl: STABLECOIN_CHART_CACHE_CONTROL,
	handle: async (req) => {
		if (req.method !== 'GET') {
			return legacyMethodNotAllowed()
		}

		const scope = queryString(req.query, 'scope') ?? 'global'
		const rawChart = queryString(req.query, 'chart')
		if (!rawChart) {
			return badRequest('valid chart parameter is required')
		}

		try {
			let chart: StablecoinVolumeGlobalChartKind | StablecoinVolumeChainChartKind | StablecoinVolumeTokenChartKind
			let data: StablecoinVolumeChartResponse
			if (scope === 'global') {
				if (!GLOBAL_CHARTS.has(rawChart as StablecoinVolumeGlobalChartKind)) {
					return badRequest('unsupported global volume chart')
				}
				chart = rawChart as StablecoinVolumeGlobalChartKind
				data = await fetchStablecoinVolumeChartApi(chart)
			} else if (scope === 'chain') {
				if (!CHAIN_CHARTS.has(rawChart as StablecoinVolumeChainChartKind)) {
					return badRequest('unsupported chain volume chart')
				}
				const chain = queryString(req.query, 'chain')
				if (!chain) return badRequest('chain parameter is required')
				const [{ default: metadataCache }, { resolveChainParamFromMetadata }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/chains')
				])
				const chainRoute = resolveChainParamFromMetadata(chain, metadataCache)
				if (!chainRoute) return notFound('chain not found')
				chart = rawChart as StablecoinVolumeChainChartKind
				data = await fetchStablecoinChainVolumeChartApi(chainRoute.canonicalName, chart, metadataCache.chainMetadata)
			} else if (scope === 'token') {
				if (!TOKEN_CHARTS.has(rawChart as StablecoinVolumeTokenChartKind)) {
					return badRequest('unsupported token volume chart')
				}
				const token = queryString(req.query, 'token')
				if (!token) return badRequest('token parameter is required')
				chart = rawChart as StablecoinVolumeTokenChartKind
				data = await fetchStablecoinTokenVolumeChartApi(token, chart)
			} else {
				return badRequest('unsupported scope')
			}

			const payload = buildStablecoinVolumeChartPayload(data, {
				chart,
				limit: parseLimit(req.query.limit)
			})

			return ok(payload)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch stablecoin volume chart')
		}
	}
})
