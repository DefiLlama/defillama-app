import { fetchProtocolTokenLiquidityChart } from '~/api'
import { fetchCoinGeckoChartByIdWithCacheFallback, getCachedCgChartData } from '~/api/coingecko'
import { CACHE_SERVER, YIELD_PROJECT_MEDIAN_API } from '~/constants'
import {
	fetchAdapterChainChartData,
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolChartDataByBreakdownType
} from '~/containers/AdapterMetrics/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { fetchChainAssetsChart } from '~/containers/BridgedTVL/api'
import { fetchBridgeVolumeBySlug } from '~/containers/Bridges/api'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import { fetchAndFormatGovernanceData } from '~/containers/Governance/queries.client'
import { fetchNftMarketplaceVolumes } from '~/containers/Nft/api'
import { fetchOracleProtocolChart } from '~/containers/Oracles/api'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'
import { normalizeBridgeVolumeToChartMs } from '~/containers/ProtocolOverview/chartSeries.utils'
import { fetchRaises } from '~/containers/Raises/api'
import { getStablecoinOverviewChartSeries } from '~/containers/Stablecoins/queries.server'
import { getProtocolEmissionsCharts, getProtocolUnlockUsdChart } from '~/containers/Unlocks/queries'
import type { ChainNativeFeeRevenueMetric } from '~/metrics/definitions'
import {
	getChainNativeFeeRevenueMetricForAdapterProtocol,
	isChainNativeFeeExtraForAdapterProtocol
} from '~/metrics/routeSemantics'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { queryString } from '../params'
import { badRequest, notFound, ok } from '../respond'
import { defineApiRoute } from '../types'

const CHART_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

type StablecoinMcapSeriesPoint = [number, number]

// ---------------------------------------------------------------------------
// /api/public/charts/chain
// ---------------------------------------------------------------------------

async function resolveCanonicalChainParam(
	chain: string,
	options: { allowAll?: boolean; requiredFlag?: 'chainAssets' } = {}
): Promise<string | null> {
	if (chain.toLowerCase() === 'all') return options.allowAll === false ? null : 'All'
	const { resolveChainParam } = await import('~/server/routeCache/chains')
	const chainRoute = await resolveChainParam(chain)
	if (options.requiredFlag && !chainRoute?.metadata[options.requiredFlag]) return null
	return chainRoute?.canonicalName ?? null
}

async function resolveCanonicalChainProtocolParam(protocol: string): Promise<string | null> {
	const { resolveProtocolParam } = await import('~/server/routeCache/protocols')
	const protocolRoute = await resolveProtocolParam(protocol)
	return protocolRoute?.canonicalSlug ?? null
}

async function resolveCanonicalChainNativeFeeRevenueProtocolParam(
	chain: string,
	metric: ChainNativeFeeRevenueMetric
): Promise<string | null> {
	if (chain.toLowerCase() === 'all') return null
	const { resolveChainParam } = await import('~/server/routeCache/chains')
	const chainRoute = await resolveChainParam(chain)
	return chainRoute?.metadata[metric.metadataFlag] ? chainRoute.canonicalName : null
}

async function resolveCanonicalChainNativeFeeExtraProtocolParam(chain: string): Promise<string | null> {
	if (chain.toLowerCase() === 'all') return null
	const { resolveChainParam } = await import('~/server/routeCache/chains')
	const chainRoute = await resolveChainParam(chain)
	return chainRoute?.metadata.chainFees || chainRoute?.metadata.chainRevenue ? chainRoute.canonicalName : null
}

async function resolveCanonicalAdapterProtocolParam(
	protocol: string,
	adapterType: string,
	dataType: string | undefined,
	entity: string | undefined
): Promise<string | null> {
	const chainNativeFeeRevenueMetric = getChainNativeFeeRevenueMetricForAdapterProtocol({ adapterType, dataType })
	const isChainNativeFeeExtra = isChainNativeFeeExtraForAdapterProtocol({ adapterType, dataType })

	if (entity === 'chain') {
		if (chainNativeFeeRevenueMetric) {
			return resolveCanonicalChainNativeFeeRevenueProtocolParam(protocol, chainNativeFeeRevenueMetric)
		}
		if (isChainNativeFeeExtra) {
			return resolveCanonicalChainNativeFeeExtraProtocolParam(protocol)
		}
		return null
	}

	const canonicalProtocol = await resolveCanonicalChainProtocolParam(protocol)
	if (canonicalProtocol) return canonicalProtocol
	if (entity === 'protocol') return null
	// Stale clients may omit entity; keep the fallback narrow so app metrics and
	// unknown values still fail route-cache validation before reaching upstream.
	if (chainNativeFeeRevenueMetric) {
		return resolveCanonicalChainNativeFeeRevenueProtocolParam(protocol, chainNativeFeeRevenueMetric)
	}
	if (isChainNativeFeeExtra) {
		return resolveCanonicalChainNativeFeeExtraProtocolParam(protocol)
	}
	return null
}

const buildChainStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
	try {
		const data = await getStablecoinOverviewChartSeries({ chain: chain === 'All' ? null : chain, chart: 'totalMcap' })
		const series: StablecoinMcapSeriesPoint[] = []
		for (const point of data.dataset.source) {
			const timestamp = Number(point.timestamp)
			const mcap = Number(point.Mcap)
			if (!Number.isFinite(timestamp) || !Number.isFinite(mcap)) continue
			series.push([timestamp, mcap])
		}
		return series
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return null
	}
}

export const chainCharts = defineApiRoute({
	route: '/api/public/charts/chain',
	cacheControl: CHART_CACHE_CONTROL,
	handle: async (req) => {
		const kind = queryString(req.query, 'kind')
		if (!kind) {
			return badRequest('kind parameter is required')
		}

		try {
			if (kind === 'adapter-chain') {
				const adapterType = queryString(req.query, 'adapterType')
				const chain = queryString(req.query, 'chain')
				const dataType = queryString(req.query, 'dataType')
				const category = queryString(req.query, 'category')

				if (!adapterType || !chain) {
					return badRequest('adapterType and chain parameters are required')
				}
				const canonicalChain = await resolveCanonicalChainParam(chain)
				if (!canonicalChain) {
					return notFound('chain not found')
				}

				const data = await fetchAdapterChainChartData({
					adapterType: adapterType as Parameters<typeof fetchAdapterChainChartData>[0]['adapterType'],
					chain: canonicalChain,
					...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterChainChartData>[0]['dataType'] } : {}),
					...(category ? { category } : {})
				})
				return ok(data)
			}

			if (kind === 'adapter-protocol') {
				const adapterType = queryString(req.query, 'adapterType')
				const protocol = queryString(req.query, 'protocol')
				const dataType = queryString(req.query, 'dataType')
				const entity = queryString(req.query, 'entity')

				if (!adapterType || !protocol) {
					return badRequest('adapterType and protocol parameters are required')
				}
				if (entity && entity !== 'chain' && entity !== 'protocol') {
					return badRequest('entity parameter must be chain or protocol')
				}
				const canonicalProtocol = await resolveCanonicalAdapterProtocolParam(protocol, adapterType, dataType, entity)
				if (!canonicalProtocol) {
					return notFound('protocol not found')
				}

				const data = await fetchAdapterProtocolChartData({
					adapterType: adapterType as Parameters<typeof fetchAdapterProtocolChartData>[0]['adapterType'],
					protocol: canonicalProtocol,
					...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterProtocolChartData>[0]['dataType'] } : {})
				})
				return ok(data)
			}

			if (kind === 'bridged-tvl') {
				const chain = queryString(req.query, 'chain')
				if (!chain) {
					return badRequest('chain parameter is required')
				}
				const canonicalChain = await resolveCanonicalChainParam(chain, { allowAll: false, requiredFlag: 'chainAssets' })
				if (!canonicalChain) {
					return notFound('chain not found')
				}

				const data = await fetchChainAssetsChart(slug(canonicalChain)).catch((error) => {
					recordRouteRuntimeError(error, 'apiRoute')
					return null
				})
				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'raises') {
				const data = await fetchRaises().then((response) => {
					const store = (response?.raises ?? []).reduce(
						(acc, curr) => {
							acc[curr.date] = (acc[curr.date] ?? 0) + +(curr.amount ?? 0)
							return acc
						},
						{} as Record<string, number>
					)

					const chart: Array<[number, number]> = []
					for (const date in store) {
						chart.push([+date * 1e3, store[date] * 1e6])
					}
					return chart
				})

				return ok(data)
			}

			if (kind === 'stablecoins-mcap') {
				const chain = queryString(req.query, 'chain')
				if (!chain) {
					return badRequest('chain parameter is required')
				}

				const canonicalChain = await resolveCanonicalChainParam(chain)
				if (!canonicalChain) {
					return notFound('chain not found')
				}

				const data = await buildChainStablecoinMcapSeries(canonicalChain)
				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'net-inflows') {
				const chain = queryString(req.query, 'chain')
				if (!chain) {
					return badRequest('chain parameter is required')
				}
				const canonicalChain = await resolveCanonicalChainParam(chain)
				if (!canonicalChain) {
					return notFound('chain not found')
				}

				const data = await getBridgeOverviewPageData(canonicalChain)
					.then((pageData) =>
						pageData?.chainVolumeData
							? pageData.chainVolumeData.map((volume) => [
									volume?.date ?? null,
									volume?.Deposits ?? null,
									volume?.Withdrawals ?? null
								])
							: null
					)
					.catch((error) => {
						recordRouteRuntimeError(error, 'apiRoute')
						return null
					})

				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'token-incentives') {
				// Chain overview renders this chart, but the data is still keyed by a
				// protocol emissions slug rather than a chain slug.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}
				const [{ default: metadataCache }, { resolveProtocolParamFromMetadata }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/protocols')
				])
				const protocolRoute = resolveProtocolParamFromMetadata(protocol, metadataCache)
				if (!protocolRoute || !metadataCache.emissionsProtocolsList.includes(protocolRoute.canonicalSlug)) {
					return notFound('protocol emissions not found')
				}

				const chart = await getProtocolUnlockUsdChart(protocolRoute.canonicalSlug).catch(() => null)
				if (!chart) {
					return ok(null, NO_STORE_HEADERS)
				}

				const nonZeroIndex = chart.findIndex((point) => Array.isArray(point) && Number(point[1]) > 0)
				return ok(chart.slice(nonZeroIndex >= 0 ? nonZeroIndex : 0))
			}

			return badRequest(`Unsupported kind: ${kind}`)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Aggregated upstream failure; 502 so origin issues are never cached or
			// confused with handler bugs.
			return { status: 502, body: { error: 'Failed to load chain chart data' } }
		}
	}
})

// ---------------------------------------------------------------------------
// /api/public/charts/coingecko/[geckoId]
// ---------------------------------------------------------------------------

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && error.message.includes('[404]')
}

async function fetchTokenTotalSupply(geckoId: string): Promise<number | null> {
	try {
		const data = await fetchJson<{ data?: { total_supply?: number | null } }>(`${CACHE_SERVER}/supply/${geckoId}`)
		const rawSupply = data?.data?.total_supply ?? null
		return rawSupply != null && Number.isFinite(rawSupply) ? rawSupply : null
	} catch (error) {
		if (isNotFoundError(error)) return null
		throw error
	}
}

export const coingeckoChart = defineApiRoute({
	route: '/api/public/charts/coingecko/[geckoId]',
	cacheControl: CHART_CACHE_CONTROL,
	handle: async (req) => {
		const geckoId = queryString(req.query, 'geckoId')
		if (!geckoId) {
			return badRequest('geckoId parameter is required')
		}

		const kind = queryString(req.query, 'kind')

		try {
			if (kind === 'supply') {
				// Supply is not part of the CoinGecko chart payload; it comes from the
				// cache-server supply snapshot while price charts use the CG cache path.
				const totalSupply = await fetchTokenTotalSupply(geckoId)
				if (totalSupply === null) {
					return ok({ totalSupply }, NO_STORE_HEADERS)
				}
				return ok({ totalSupply })
			}

			const fullChart = queryString(req.query, 'fullChart') !== 'false'
			const chart = await fetchCoinGeckoChartByIdWithCacheFallback(geckoId, { fullChart })
			if (!chart) {
				return ok(null, NO_STORE_HEADERS)
			}

			return ok(chart)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Legacy recorded 500; the status and body are pinned by
			// src/api/__tests__/charts-coingecko.test.ts.
			return { status: 500, body: { error: 'Failed to load coingecko chart data' } }
		}
	}
})

// ---------------------------------------------------------------------------
// /api/public/charts/protocol
// ---------------------------------------------------------------------------

const VALID_ADAPTER_TYPES = new Set<string>(Object.values(ADAPTER_TYPES))
const VALID_ADAPTER_DATA_TYPES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))
const VALID_ADAPTER_BREAKDOWN_TYPES = new Set<AdapterBreakdownType>(['chain', 'version'])
const VALID_GECKO_ID = /^[A-Za-z0-9._-]{1,80}$/

type AdapterBreakdownType = Parameters<typeof fetchAdapterProtocolChartDataByBreakdownType>[0]['type']
type AdapterBreakdownRequest =
	| {
			ok: true
			value: {
				adapterType: `${ADAPTER_TYPES}`
				protocol: string
				type: AdapterBreakdownType
				dataType?: `${ADAPTER_DATA_TYPES}`
			}
	  }
	| { ok: false; error: string }

const getBodyParam = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const getArrayBodyParam = (value: unknown): string[] | null =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null

// Protocol chart pages can also render CEX-like asset pages. Resolve normal
// protocol metadata first, then fall back to the asset route cache.
async function resolveCanonicalProtocolOrCexParam(protocol: string): Promise<string | null> {
	const { resolveProtocolParam } = await import('~/server/routeCache/protocols')
	const protocolRoute = await resolveProtocolParam(protocol)
	if (protocolRoute?.canonicalSlug) {
		return protocolRoute.canonicalSlug
	}

	const { resolveCexParam } = await import('~/server/routeCache/assets')
	const cexRoute = await resolveCexParam(protocol)
	return cexRoute?.canonicalSlug ?? null
}

const isValidAdapterType = (value: string): value is `${ADAPTER_TYPES}` => VALID_ADAPTER_TYPES.has(value)
const isValidAdapterDataType = (value: string): value is `${ADAPTER_DATA_TYPES}` => VALID_ADAPTER_DATA_TYPES.has(value)
const isValidAdapterBreakdownType = (value: string): value is AdapterBreakdownType =>
	VALID_ADAPTER_BREAKDOWN_TYPES.has(value as AdapterBreakdownType)

const parseStringArrayParam = (value: string | undefined): string[] | null => {
	if (!value) return null

	try {
		const parsed = JSON.parse(value) as unknown
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null
	} catch {
		return null
	}
}

// Upstream adapter breakdown charts only support these named dimensions; reject
// arbitrary strings here instead of forwarding them as a loose passthrough.
const parseAdapterBreakdownRequest = (params: {
	adapterType?: string
	protocol?: string
	type?: string
	dataType?: string
}): AdapterBreakdownRequest => {
	const { adapterType, protocol, type, dataType } = params

	if (!adapterType || !protocol || !type) {
		return { ok: false, error: 'adapterType, protocol, and type parameters are required' }
	}
	if (!isValidAdapterType(adapterType)) {
		return { ok: false, error: `Invalid adapterType: ${adapterType}` }
	}
	if (!isValidAdapterBreakdownType(type)) {
		return { ok: false, error: `Invalid type: ${type}` }
	}

	const validatedDataType = dataType && isValidAdapterDataType(dataType) ? dataType : undefined
	if (dataType && !validatedDataType) {
		return { ok: false, error: `Invalid dataType: ${dataType}` }
	}

	return {
		ok: true,
		value: {
			adapterType,
			protocol,
			type,
			...(validatedDataType ? { dataType: validatedDataType } : {})
		}
	}
}

export const protocolCharts = defineApiRoute({
	route: '/api/public/charts/protocol',
	methods: ['GET', 'POST'],
	cacheControl: CHART_CACHE_CONTROL,
	handle: async (req) => {
		const requestBody = (req.body ?? null) as { kind?: unknown; apis?: unknown } | null
		const kind = queryString(req.query, 'kind') ?? getBodyParam(requestBody?.kind)
		if (!kind) {
			return badRequest('kind parameter is required')
		}

		try {
			if (kind === 'adapter') {
				const adapterType = queryString(req.query, 'adapterType')
				const protocol = queryString(req.query, 'protocol')
				const dataType = queryString(req.query, 'dataType')

				if (!adapterType || !protocol) {
					return badRequest('adapterType and protocol parameters are required')
				}
				if (!isValidAdapterType(adapterType)) {
					return badRequest(`Invalid adapterType: ${adapterType}`)
				}
				if (dataType && !isValidAdapterDataType(dataType)) {
					return badRequest(`Invalid dataType: ${dataType}`)
				}
				const validatedDataType = dataType && isValidAdapterDataType(dataType) ? dataType : undefined
				const canonicalProtocol = await resolveCanonicalProtocolOrCexParam(protocol)
				if (!canonicalProtocol) {
					return notFound('protocol not found')
				}

				const data = await fetchAdapterProtocolChartData({
					adapterType,
					protocol: canonicalProtocol,
					...(validatedDataType ? { dataType: validatedDataType } : {})
				})
				return ok(data)
			}

			if (kind === 'adapter-breakdown') {
				const parsedRequest = parseAdapterBreakdownRequest({
					adapterType: queryString(req.query, 'adapterType'),
					protocol: queryString(req.query, 'protocol'),
					type: queryString(req.query, 'type'),
					dataType: queryString(req.query, 'dataType')
				})

				if (parsedRequest.ok === false) {
					return badRequest(parsedRequest.error)
				}
				const canonicalProtocol = await resolveCanonicalProtocolOrCexParam(parsedRequest.value.protocol)
				if (!canonicalProtocol) {
					return notFound('protocol not found')
				}

				const data = await fetchAdapterProtocolChartDataByBreakdownType({
					...parsedRequest.value,
					protocol: canonicalProtocol
				})
				return ok(data)
			}

			if (kind === 'tvl' || kind === 'treasury') {
				const protocol = queryString(req.query, 'protocol')
				const key = queryString(req.query, 'key')
				const currency = queryString(req.query, 'currency')
				const breakdownType = queryString(req.query, 'breakdownType')

				if (!protocol) {
					return badRequest('protocol parameter is required')
				}
				const canonicalProtocol = await resolveCanonicalProtocolOrCexParam(protocol)
				if (!canonicalProtocol) {
					return notFound('protocol not found')
				}

				const chartParams = {
					protocol: canonicalProtocol,
					...(key ? { key } : {}),
					...(currency ? { currency } : {}),
					...(breakdownType
						? {
								breakdownType: breakdownType as NonNullable<Parameters<typeof fetchProtocolTvlChart>[0]['breakdownType']>
							}
						: {})
				}

				const data =
					kind === 'tvl' ? await fetchProtocolTvlChart(chartParams) : await fetchProtocolTreasuryChart(chartParams)
				return ok(data)
			}

			if (kind === 'token-liquidity') {
				const protocolId = queryString(req.query, 'protocolId')
				if (!protocolId) {
					return badRequest('protocolId parameter is required')
				}

				const data = await fetchProtocolTokenLiquidityChart(protocolId)
				return ok(data)
			}

			if (kind === 'median-apy') {
				// Yield median APY uses yield project IDs, which are not always the
				// same namespace as protocol route slugs.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}

				const data = await fetchJson<{ data: Array<{ timestamp: string; medianAPY: number; [key: string]: unknown }> }>(
					`${YIELD_PROJECT_MEDIAN_API}/${protocol}`
				)
					.then((values) =>
						values && values.data.length > 0
							? values.data.map((item) => ({
									...item,
									date: Math.floor(new Date(item.timestamp).getTime() / 1000)
								}))
							: null
					)
					.catch(() => null)

				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'unlocks') {
				// Unlock charts are keyed by emissions metadata; a valid protocol route
				// does not necessarily have emissions chart data.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}
				const [{ default: metadataCache }, { resolveProtocolParam }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/protocols')
				])
				const protocolRoute = await resolveProtocolParam(protocol)
				if (!protocolRoute || !metadataCache.emissionsProtocolsList.includes(protocolRoute.canonicalSlug)) {
					return notFound('protocol emissions not found')
				}

				const result = await getProtocolEmissionsCharts(protocolRoute.canonicalSlug)
				const data = {
					...result,
					unlockUsdChart: Array.isArray(result.unlockUsdChart)
						? result.unlockUsdChart
								.filter(
									(item): item is [string | number, string | number] =>
										Array.isArray(item) &&
										item.length >= 2 &&
										Number.isFinite(Number(item[0])) &&
										Number.isFinite(Number(item[1]))
								)
								.map((item): [number, number] => [Number(item[0]), Number(item[1])])
						: null
				}

				return ok(data)
			}

			if (kind === 'bridge-volume') {
				// Bridge volume uses bridge protocol slugs, a separate namespace from
				// normal protocol route slugs.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}
				const [{ default: metadataCache }, { resolveBridgeProtocolParamFromMetadata }] = await Promise.all([
					import('~/utils/metadata'),
					import('~/server/routeCache/bridges')
				])
				const bridgeSlug = resolveBridgeProtocolParamFromMetadata(protocol, metadataCache)
				if (!bridgeSlug) {
					return notFound('bridge protocol not found')
				}

				const data = await fetchBridgeVolumeBySlug(bridgeSlug)
					.then((response) => normalizeBridgeVolumeToChartMs(response.dailyVolumes))
					.catch(() => null)

				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'oracle-chart') {
				// Oracle charts are keyed by oracle route metadata instead of protocol
				// route metadata.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}
				const metadataCache = await import('~/utils/metadata').then((m) => m.default)
				const canonicalOracle = metadataCache.oracleRoutes.oracleNameBySlug[slug(protocol)]
				if (!canonicalOracle) {
					return notFound('oracle protocol not found')
				}

				const data = await fetchOracleProtocolChart({ protocol: canonicalOracle }).catch(() => null)
				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'governance') {
				const apis = getArrayBodyParam(requestBody?.apis) ?? parseStringArrayParam(queryString(req.query, 'apis'))
				if (!apis || apis.length === 0) {
					return badRequest('apis parameter is required')
				}

				const data = await fetchAndFormatGovernanceData(apis)
				return ok(data)
			}

			if (kind === 'nft-volume') {
				// NFT volume matches marketplace exchange names from the NFT API, not
				// protocol route metadata.
				const protocol = queryString(req.query, 'protocol')
				if (!protocol) {
					return badRequest('protocol parameter is required')
				}

				const data = await fetchNftMarketplaceVolumes()
					.then((response) =>
						response
							.filter((item) => slug(item.exchangeName) === slug(protocol))
							.map(({ day, sumUsd }): [number, number] => [new Date(day).getTime(), sumUsd])
					)
					.catch((): null => null)

				if (data === null) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			if (kind === 'coingecko') {
				const geckoId = queryString(req.query, 'geckoId')
				if (!geckoId || !VALID_GECKO_ID.test(geckoId)) {
					return badRequest('Invalid geckoId parameter')
				}

				const fullChart = queryString(req.query, 'fullChart') === 'true'
				const data = await getCachedCgChartData(geckoId, fullChart)
				if (!data) {
					return ok(null, NO_STORE_HEADERS)
				}

				return ok(data)
			}

			return badRequest(`Unsupported kind: ${kind}`)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Highest-volume route in the app; behavior preserved exactly from the
			// pre-conversion handler, including the recorded 500 on failure.
			return { status: 500, body: { error: 'Failed to load protocol chart data' } }
		}
	}
})
