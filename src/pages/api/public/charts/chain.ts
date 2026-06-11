import type { NextApiRequest, NextApiResponse } from 'next'
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
import { slug } from '~/utils'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseData = unknown[] | Record<string, unknown> | { error: string } | null
type StablecoinMcapSeriesPoint = [number, number]
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_CACHE_CONTROL = 'no-store'

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

const setSuccessCacheHeaders = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', jitterCacheControlHeader(SUCCESS_CACHE_CONTROL, req.url ?? '/api/public/charts/chain'))
}

const setNoStoreHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
}

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

async function resolveCanonicalProtocolParam(protocol: string): Promise<string | null> {
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

	const canonicalProtocol = await resolveCanonicalProtocolParam(protocol)
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

const buildStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
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

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		setNoStoreHeaders(res)
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const kind = getQueryParam(req.query.kind)
	if (!kind) {
		setNoStoreHeaders(res)
		return res.status(400).json({ error: 'kind parameter is required' })
	}

	try {
		if (kind === 'adapter-chain') {
			const adapterType = getQueryParam(req.query.adapterType)
			const chain = getQueryParam(req.query.chain)
			const dataType = getQueryParam(req.query.dataType)
			const category = getQueryParam(req.query.category)

			if (!adapterType || !chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'adapterType and chain parameters are required' })
			}
			const canonicalChain = await resolveCanonicalChainParam(chain)
			if (!canonicalChain) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'chain not found' })
			}

			const data = await fetchAdapterChainChartData({
				adapterType: adapterType as Parameters<typeof fetchAdapterChainChartData>[0]['adapterType'],
				chain: canonicalChain,
				...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterChainChartData>[0]['dataType'] } : {}),
				...(category ? { category } : {})
			})
			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
		}

		if (kind === 'adapter-protocol') {
			const adapterType = getQueryParam(req.query.adapterType)
			const protocol = getQueryParam(req.query.protocol)
			const dataType = getQueryParam(req.query.dataType)
			const entity = getQueryParam(req.query.entity)

			if (!adapterType || !protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'adapterType and protocol parameters are required' })
			}
			if (entity && entity !== 'chain' && entity !== 'protocol') {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'entity parameter must be chain or protocol' })
			}
			const canonicalProtocol = await resolveCanonicalAdapterProtocolParam(protocol, adapterType, dataType, entity)
			if (!canonicalProtocol) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'protocol not found' })
			}

			const data = await fetchAdapterProtocolChartData({
				adapterType: adapterType as Parameters<typeof fetchAdapterProtocolChartData>[0]['adapterType'],
				protocol: canonicalProtocol,
				...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterProtocolChartData>[0]['dataType'] } : {})
			})
			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
		}

		if (kind === 'bridged-tvl') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}
			const canonicalChain = await resolveCanonicalChainParam(chain, { allowAll: false, requiredFlag: 'chainAssets' })
			if (!canonicalChain) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'chain not found' })
			}

			const data = await fetchChainAssetsChart(slug(canonicalChain)).catch((error) => {
				recordRouteRuntimeError(error, 'apiRoute')
				return null
			})
			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
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

			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
		}

		if (kind === 'stablecoins-mcap') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}

			const canonicalChain = await resolveCanonicalChainParam(chain)
			if (!canonicalChain) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'chain not found' })
			}

			const data = await buildStablecoinMcapSeries(canonicalChain)
			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
		}

		if (kind === 'net-inflows') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}
			const canonicalChain = await resolveCanonicalChainParam(chain)
			if (!canonicalChain) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'chain not found' })
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
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(req, res)
			return res.status(200).json(data)
		}

		if (kind === 'token-incentives') {
			// Chain overview renders this chart, but the data is still keyed by a
			// protocol emissions slug rather than a chain slug.
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}
			const [{ default: metadataCache }, { resolveProtocolParamFromMetadata }] = await Promise.all([
				import('~/utils/metadata'),
				import('~/server/routeCache/protocols')
			])
			const protocolRoute = resolveProtocolParamFromMetadata(protocol, metadataCache)
			if (!protocolRoute || !metadataCache.emissionsProtocolsList.includes(protocolRoute.canonicalSlug)) {
				setNoStoreHeaders(res)
				return res.status(404).json({ error: 'protocol emissions not found' })
			}

			const chart = await getProtocolUnlockUsdChart(protocolRoute.canonicalSlug).catch(() => null)
			if (!chart) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			const nonZeroIndex = chart.findIndex((point) => Array.isArray(point) && Number(point[1]) > 0)
			setSuccessCacheHeaders(req, res)
			return res.status(200).json(chart.slice(nonZeroIndex >= 0 ? nonZeroIndex : 0))
		}

		setNoStoreHeaders(res)
		return res.status(400).json({ error: `Unsupported kind: ${kind}` })
	} catch (error) {
		setNoStoreHeaders(res)
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to load chain chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/charts/chain', handler)
