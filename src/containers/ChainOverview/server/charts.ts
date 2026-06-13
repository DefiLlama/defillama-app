import { fetchAdapterChainChartData, fetchAdapterProtocolChartData } from '~/containers/AdapterMetrics/api'
import { fetchChainAssetsChart } from '~/containers/BridgedTVL/api'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import { fetchRaises } from '~/containers/Raises/api'
import { getStablecoinOverviewChartSeries } from '~/containers/Stablecoins/queries.server'
import { getProtocolUnlockUsdChart } from '~/containers/Unlocks/queries'
import type { ChainNativeFeeRevenueMetric } from '~/metrics/definitions'
import {
	getChainNativeFeeRevenueMetricForAdapterProtocol,
	isChainNativeFeeExtraForAdapterProtocol
} from '~/metrics/routeSemantics'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { slug } from '~/utils'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const CHART_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

type StablecoinMcapSeriesPoint = [number, number]

// ---------------------------------------------------------------------------
// /api/public/chains/charts
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
	route: '/api/public/chains/charts',
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
