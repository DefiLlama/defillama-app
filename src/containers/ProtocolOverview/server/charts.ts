import { fetchProtocolTokenLiquidityChart } from '~/api'
import {
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolChartDataByBreakdownType
} from '~/containers/AdapterMetrics/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { fetchBridgeVolumeBySlug } from '~/containers/Bridges/api'
import { fetchAndFormatGovernanceData } from '~/containers/Governance/queries.client'
import { fetchNftMarketplaceVolumes } from '~/containers/Nft/api'
import { fetchOracleProtocolChart } from '~/containers/Oracles/api'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'
import { normalizeBridgeVolumeToChartMs } from '~/containers/ProtocolOverview/chartSeries.utils'
import { getProtocolEmissionsCharts } from '~/containers/Unlocks/queries'
import { YIELD_PROJECT_MEDIAN_API } from '~/containers/Yields/constants'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const CHART_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

// ---------------------------------------------------------------------------
// /api/public/protocols/charts
// ---------------------------------------------------------------------------

const VALID_ADAPTER_TYPES = new Set<string>(Object.values(ADAPTER_TYPES))
const VALID_ADAPTER_DATA_TYPES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))
const VALID_ADAPTER_BREAKDOWN_TYPES = new Set<AdapterBreakdownType>(['chain', 'version'])

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
	const { resolveProtocolParam } = await import('~/containers/ProtocolOverview/server/routes')
	const protocolRoute = await resolveProtocolParam(protocol)
	if (protocolRoute?.canonicalSlug) {
		return protocolRoute.canonicalSlug
	}

	const { resolveCexParam } = await import('~/containers/Cexs/server/routes')
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
	route: '/api/public/protocols/charts',
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
								breakdownType: breakdownType as NonNullable<
									Parameters<typeof fetchProtocolTvlChart>[0]['breakdownType']
								>
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
					import('~/containers/ProtocolOverview/server/routes')
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
					import('~/containers/Bridges/server/routes')
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

			return badRequest(`Unsupported kind: ${kind}`)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Highest-volume route in the app; behavior preserved exactly from the
			// pre-conversion handler, including the recorded 500 on failure.
			return { status: 500, body: { error: 'Failed to load protocol chart data' } }
		}
	}
})
