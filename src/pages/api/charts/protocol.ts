import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchProtocolTokenLiquidityChart } from '~/api'
import { YIELD_PROJECT_MEDIAN_API } from '~/constants'
import { fetchBridgeVolumeBySlug } from '~/containers/Bridges/api'
import { fetchAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import { fetchAndFormatGovernanceData } from '~/containers/Governance/queries.client'
import { fetchNftMarketplaceVolumes } from '~/containers/Nft/api'
import { fetchOracleProtocolChart } from '~/containers/Oracles/api'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from '~/containers/ProtocolOverview/api'
import { normalizeBridgeVolumeToChartMs } from '~/containers/ProtocolOverview/chartSeries.utils'
import { getProtocolEmissionsCharts } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'

type ResponseData = unknown[] | Record<string, unknown> | { error: string } | null

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

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
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const kind = getQueryParam(req.query.kind)
	if (!kind) {
		return res.status(400).json({ error: 'kind parameter is required' })
	}

	try {
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')

		if (kind === 'adapter') {
			const adapterType = getQueryParam(req.query.adapterType)
			const protocol = getQueryParam(req.query.protocol)
			const dataType = getQueryParam(req.query.dataType)

			if (!adapterType || !protocol) {
				return res.status(400).json({ error: 'adapterType and protocol parameters are required' })
			}

			const data = await fetchAdapterProtocolChartData({
				adapterType: adapterType as Parameters<typeof fetchAdapterProtocolChartData>[0]['adapterType'],
				protocol,
				...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterProtocolChartData>[0]['dataType'] } : {})
			})
			return res.status(200).json(data)
		}

		if (kind === 'tvl' || kind === 'treasury') {
			const protocol = getQueryParam(req.query.protocol)
			const key = getQueryParam(req.query.key)
			const currency = getQueryParam(req.query.currency)
			const breakdownType = getQueryParam(req.query.breakdownType)

			if (!protocol) {
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
			return res.status(200).json(data)
		}

		if (kind === 'token-liquidity') {
			const protocolId = getQueryParam(req.query.protocolId)
			if (!protocolId) {
				return res.status(400).json({ error: 'protocolId parameter is required' })
			}

			const data = await fetchProtocolTokenLiquidityChart(protocolId)
			return res.status(200).json(data)
		}

		if (kind === 'median-apy') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
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
				.catch(() => [])

			return res.status(200).json(data)
		}

		if (kind === 'unlocks') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
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

			return res.status(200).json(data)
		}

		if (kind === 'bridge-volume') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchBridgeVolumeBySlug(slug(protocol))
				.then((response) => normalizeBridgeVolumeToChartMs(response.dailyVolumes))
				.catch(() => null)

			return res.status(200).json(data)
		}

		if (kind === 'oracle-chart') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchOracleProtocolChart({ protocol }).catch(() => null)
			return res.status(200).json(data)
		}

		if (kind === 'governance') {
			const apis = parseStringArrayParam(getQueryParam(req.query.apis))
			if (!apis || apis.length === 0) {
				return res.status(400).json({ error: 'apis parameter is required' })
			}

			const data = await fetchAndFormatGovernanceData(apis)
			return res.status(200).json(data)
		}

		if (kind === 'nft-volume') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const data = await fetchNftMarketplaceVolumes()
				.then((response) =>
					response
						.filter((item) => slug(item.exchangeName) === slug(protocol))
						.map(({ day, sumUsd }): [number, number] => [new Date(day).getTime(), sumUsd])
				)
				.catch((): Array<[number, number]> => [])

			return res.status(200).json(data)
		}

		return res.status(400).json({ error: `Unsupported kind: ${kind}` })
	} catch (error) {
		console.log('Failed to fetch protocol chart data', error)
		return res.status(500).json({ error: 'Failed to load protocol chart data' })
	}
}
