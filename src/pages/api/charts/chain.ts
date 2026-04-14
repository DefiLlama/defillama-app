import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchChainAssetsChart } from '~/containers/BridgedTVL/api'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import { fetchAdapterChainChartData, fetchAdapterProtocolChartData } from '~/containers/DimensionAdapters/api'
import { fetchRaises } from '~/containers/Raises/api'
import { getStablecoinsByChainPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData } from '~/containers/Stablecoins/utils'
import { getProtocolUnlockUsdChart } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'

type ResponseData = unknown[] | Record<string, unknown> | { error: string } | null
type StablecoinMcapSeriesPoint = [number, number]
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_CACHE_CONTROL = 'no-store'

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

const setSuccessCacheHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', SUCCESS_CACHE_CONTROL)
}

const setNoStoreHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
}

const buildStablecoinMcapSeries = async (chain: string): Promise<StablecoinMcapSeriesPoint[] | null> => {
	try {
		const data = await getStablecoinsByChainPageData(chain === 'All' ? null : chain)
		const { peggedAreaTotalData } = buildStablecoinChartData({
			chartDataByAssetOrChain: data.chartDataByPeggedAsset,
			assetsOrChainsList: data.peggedAssetNames,
			filteredIndexes: Object.values(data.peggedNameToChartDataIndex),
			issuanceType: 'mcap',
			selectedChain: chain,
			doublecountedIds: data.doublecountedIds
		})

		return peggedAreaTotalData
			.map(({ date, Mcap }): StablecoinMcapSeriesPoint | null => {
				const timestamp = Number(date) * 1e3
				if (!Number.isFinite(timestamp) || !Number.isFinite(Mcap)) return null
				return [timestamp, Mcap]
			})
			.filter((point): point is StablecoinMcapSeriesPoint => point !== null)
	} catch (error) {
		console.log('Failed to build stablecoin chart series', error)
		return null
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
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

			const data = await fetchAdapterChainChartData({
				adapterType: adapterType as Parameters<typeof fetchAdapterChainChartData>[0]['adapterType'],
				chain,
				...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterChainChartData>[0]['dataType'] } : {}),
				...(category ? { category } : {})
			})
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'adapter-protocol') {
			const adapterType = getQueryParam(req.query.adapterType)
			const protocol = getQueryParam(req.query.protocol)
			const dataType = getQueryParam(req.query.dataType)

			if (!adapterType || !protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'adapterType and protocol parameters are required' })
			}

			const data = await fetchAdapterProtocolChartData({
				adapterType: adapterType as Parameters<typeof fetchAdapterProtocolChartData>[0]['adapterType'],
				protocol,
				...(dataType ? { dataType: dataType as Parameters<typeof fetchAdapterProtocolChartData>[0]['dataType'] } : {})
			})
			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'bridged-tvl') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}

			const data = await fetchChainAssetsChart(chain)
			setSuccessCacheHeaders(res)
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

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'stablecoins-mcap') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}

			const data = await buildStablecoinMcapSeries(chain)
			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'net-inflows') {
			const chain = getQueryParam(req.query.chain)
			if (!chain) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'chain parameter is required' })
			}

			const data = await getBridgeOverviewPageData(chain)
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
					console.log(error)
					return null
				})

			if (data === null) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			setSuccessCacheHeaders(res)
			return res.status(200).json(data)
		}

		if (kind === 'token-incentives') {
			const protocol = getQueryParam(req.query.protocol)
			if (!protocol) {
				setNoStoreHeaders(res)
				return res.status(400).json({ error: 'protocol parameter is required' })
			}

			const chart = await getProtocolUnlockUsdChart(slug(protocol)).catch(() => null)
			if (!chart) {
				setNoStoreHeaders(res)
				return res.status(200).json(null)
			}

			const nonZeroIndex = chart.findIndex((point) => Array.isArray(point) && Number(point[1]) > 0)
			setSuccessCacheHeaders(res)
			return res.status(200).json(chart.slice(nonZeroIndex >= 0 ? nonZeroIndex : 0))
		}

		setNoStoreHeaders(res)
		return res.status(400).json({ error: `Unsupported kind: ${kind}` })
	} catch (error) {
		setNoStoreHeaders(res)
		console.log('Failed to fetch chain chart data', error)
		return res.status(500).json({ error: 'Failed to load chain chart data' })
	}
}
