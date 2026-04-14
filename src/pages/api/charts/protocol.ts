import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchProtocolTokenLiquidityChart } from '~/api'
import { YIELD_PROJECT_MEDIAN_API } from '~/constants'
import { fetchBridgeVolumeBySlug } from '~/containers/Bridges/api'
import { fetchAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { fetchAndFormatGovernanceData } from '~/containers/Governance/queries.client'
import { fetchNftMarketplaceVolumes } from '~/containers/Nft/api'
import { fetchOracleProtocolChart } from '~/containers/Oracles/api'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'
import { normalizeBridgeVolumeToChartMs } from '~/containers/ProtocolOverview/chartSeries.utils'
import { getProtocolEmissionsCharts } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'

type ResponseData = unknown[] | Record<string, unknown> | { error: string } | null
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_CACHE_CONTROL = 'no-store'
const VALID_ADAPTER_TYPES = new Set<string>(Object.values(ADAPTER_TYPES))
const VALID_ADAPTER_DATA_TYPES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

const getBodyParam = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const getArrayBodyParam = (value: unknown): string[] | null =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null

const setSuccessCacheHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', SUCCESS_CACHE_CONTROL)
}

const setNoStoreHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
}

const isValidAdapterType = (value: string): value is `${ADAPTER_TYPES}` => VALID_ADAPTER_TYPES.has(value)

const isValidAdapterDataType = (value: string): value is `${ADAPTER_DATA_TYPES}` => VALID_ADAPTER_DATA_TYPES.has(value)

const parseStringArrayParam = (value: string | undefined): string[] | null => {
	if (!value) return null

	try {
		const parsed = JSON.parse(value) as unknown
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null
	} catch {
		return null
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET' && req.method !== 'POST') {
		res.setHeader('Allow', ['GET', 'POST'])
		setNoStoreHeaders(res)
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const kind = getQueryParam(req.query.kind) ?? getBodyParam(req.body?.kind)
	if (!kind) {
		setNoStoreHeaders(res)
		return res.status(400).json({ error: 'kind parameter is required' })
	}

	try {
		if (kind === 'adapter') {
			const adapterType = getQueryParam(req.query.adapterType)
			const protocol = getQueryParam(req.query.protocol)
			const dataType = getQueryParam(req.query.dataType)

			if (!adapterType || !protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'adapterType and protocol parameters are required' })
			}
			if (!isValidAdapterType(adapterType)) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: `Invalid adapterType: ${adapterType}` })
			}
			if (dataType && !isValidAdapterDataType(dataType)) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: `Invalid dataType: ${dataType}` })
			}
			const validatedDataType = dataType && isValidAdapterDataType(dataType) ? dataType : undefined

			const data = await fetchAdapterProtocolChartData({
				adapterType,
				protocol,
				...(validatedDataType ? { dataType: validatedDataType } : {})
			})
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'tvl' || kind === 'treasury') {
			const protocol = getQueryParam(req.query.protocol)
			const key = getQueryParam(req.query.key)
			const currency = getQueryParam(req.query.currency)
			const breakdownType = getQueryParam(req.query.breakdownType)

			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const chartParams = {
				protocol,
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
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'token-liquidity') {
			const protocolId = getQueryParam(req.query.protocolId)
			if (!protocolId) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocolId parameter is required' })
			}

			const data = await fetchProtocolTokenLiquidityChart(protocolId)
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'median-apy') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
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
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'unlocks') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const result = await getProtocolEmissionsCharts(slug(protocol))
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

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'bridge-volume') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchBridgeVolumeBySlug(slug(protocol))
				.then((response) => normalizeBridgeVolumeToChartMs(response.dailyVolumes))
				.catch(() => null)

			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'oracle-chart') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchOracleProtocolChart({ protocol }).catch(() => null)
			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'governance') {
			const apis = getArrayBodyParam(req.body?.apis) ?? parseStringArrayParam(getQueryParam(req.query.apis))
			if (!apis || apis.length === 0) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'apis parameter is required' })
			}

			const data = await fetchAndFormatGovernanceData(apis)
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'nft-volume') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchNftMarketplaceVolumes()
				.then((response) =>
					response
						.filter((item) => slug(item.exchangeName) === slug(protocol))
						.map(({ day, sumUsd }): [number, number] => [new Date(day).getTime(), sumUsd])
				)
				.catch((): null => null)

			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		setNoStoreHeaders(res)
		return res.status(400).json({ error: `Unsupported kind: ${kind}` })
	} catch (error) {
		setNoStoreHeaders(res)
		console.error('Failed to fetch protocol chart data', error)
		return res.status(500).json({ error: 'Failed to load protocol chart data' })
	}
}
