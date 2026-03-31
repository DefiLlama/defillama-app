import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELD_CHART_API, YIELD_CHART_LEND_BORROW_API } from '~/constants'
import { fetchSingleChartData, withTimeout } from '~/containers/ProDashboard/queries.server'
import ProtocolCharts from '~/containers/ProDashboard/services/ProtocolCharts'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import {
	fetchStablecoinAssetsApi,
	fetchStablecoinChartApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi
} from '~/containers/Stablecoins/api'
import { formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { fetchProtocolsByToken } from '~/containers/TokenUsage/api'
import { validateSubscription } from '~/utils/apiAuth'
import { fetchJson } from '~/utils/async'

export const config = { api: { responseLimit: false } }

const FETCH_TIMEOUT = 15_000

async function dispatchFetch(type: string, params: any): Promise<any> {
	switch (type) {
		case 'chart': {
			const { chart } = params
			if (!chart?.type) throw new Error('Missing chart config')
			return fetchSingleChartData(chart, 'all', null)
		}

		case 'stablecoins': {
			const { chain } = params
			if (!chain) throw new Error('Missing chain param')

			const [peggedData, priceData, rateData] = await Promise.all([
				withTimeout(fetchStablecoinAssetsApi(), FETCH_TIMEOUT),
				withTimeout(fetchStablecoinPricesApi(), FETCH_TIMEOUT),
				withTimeout(fetchStablecoinRatesApi(), FETCH_TIMEOUT)
			])

			const { peggedAssets } = peggedData
			const chainLabel = chain === 'All' ? 'all-llama-app' : chain
			const chainData = await withTimeout(fetchStablecoinChartApi(chainLabel), FETCH_TIMEOUT)
			const breakdown = chainData?.breakdown

			if (!breakdown) return null

			let chartDataByPeggedAsset: any[] = []
			let peggedNameToChartDataIndex: Record<string, number> = {}
			let lastTimestamp = 0

			chartDataByPeggedAsset = peggedAssets.map((elem: any, i: number) => {
				peggedNameToChartDataIndex[elem.name] = i
				const charts = breakdown[elem.id] ?? []
				const formattedCharts = charts
					.map((c: any) => ({ date: c.date, mcap: c.totalCirculatingUSD }))
					.filter((c: any) => c.mcap !== undefined)

				if (formattedCharts.length > 0) {
					lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
				}
				return formattedCharts
			})

			for (const chart of chartDataByPeggedAsset) {
				const last = chart[chart.length - 1]
				if (!last) continue
				let lastDate = Number(last.date)
				while (lastDate < lastTimestamp) {
					lastDate += 24 * 3600
					chart.push({ ...last, date: lastDate })
				}
			}

			const peggedAssetNames = peggedAssets.map((p: any) => p.name)
			const filteredPeggedAssets = formatPeggedAssetsData({
				peggedAssets,
				chartDataByPeggedAsset,
				priceData,
				rateData,
				peggedNameToChartDataIndex,
				chain: chain === 'All' ? null : chain
			})

			const doublecountedIds: number[] = []
			for (let idx = 0; idx < peggedAssets.length; idx++) {
				if ((peggedAssets[idx] as any).doublecounted) {
					doublecountedIds.push(idx)
				}
			}

			return {
				chartDataByPeggedAsset,
				peggedAssetNames,
				peggedNameToChartDataIndex,
				filteredPeggedAssets,
				doublecountedIds
			}
		}

		case 'advancedTvlBasic': {
			const { protocol } = params
			if (!protocol) throw new Error('Missing protocol param')
			return withTimeout(ProtocolCharts.tvl(protocol), FETCH_TIMEOUT)
		}

		case 'protocolFull': {
			const { protocol } = params
			if (!protocol) throw new Error('Missing protocol param')
			return withTimeout(fetchProtocolBySlug(protocol), FETCH_TIMEOUT)
		}

		case 'yields': {
			const { poolConfigId } = params
			if (!poolConfigId) throw new Error('Missing poolConfigId param')
			return withTimeout(fetchJson(`${YIELD_CHART_API}/${encodeURIComponent(poolConfigId)}`), FETCH_TIMEOUT)
		}

		case 'yieldsLendBorrow': {
			const { poolConfigId } = params
			if (!poolConfigId) throw new Error('Missing poolConfigId param')
			return withTimeout(fetchJson(`${YIELD_CHART_LEND_BORROW_API}/${encodeURIComponent(poolConfigId)}`), FETCH_TIMEOUT)
		}

		case 'tokenUsage': {
			const { symbol } = params
			if (!symbol) throw new Error('Missing symbol param')
			return withTimeout(fetchProtocolsByToken(String(symbol)), FETCH_TIMEOUT)
		}

		case 'stablecoinsList': {
			return withTimeout(fetchStablecoinAssetsApi(), FETCH_TIMEOUT)
		}

		case 'stablecoinAsset': {
			const { slug } = params
			if (!slug) throw new Error('Missing slug param')
			const { fetchStablecoinPeggedConfigApi, fetchStablecoinAssetApi } = await import(
				'~/containers/Stablecoins/api'
			)
			const peggedNameToPeggedIDMapping = await withTimeout(fetchStablecoinPeggedConfigApi(), FETCH_TIMEOUT)
			const peggedID = peggedNameToPeggedIDMapping[slug]
			if (!peggedID) return null
			return withTimeout(fetchStablecoinAssetApi(peggedID), FETCH_TIMEOUT)
		}

		default:
			throw new Error(`Unknown fetch type: ${type}`)
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const auth = await validateSubscription(req.headers.authorization)
	if (auth.valid === false) {
		return res.status(auth.status).json({ error: auth.error })
	}

	const { type, params: paramsStr } = req.query
	if (!type || !paramsStr) {
		return res.status(400).json({ error: 'Missing type or params' })
	}

	let params: any
	try {
		params = JSON.parse(paramsStr as string)
	} catch {
		return res.status(400).json({ error: 'Invalid params JSON' })
	}

	try {
		const data = await dispatchFetch(type as string, params)
		res.setHeader('Cache-Control', 'private, max-age=300')
		return res.status(200).json({ data })
	} catch (error) {
		console.log(`Dashboard fetch error (${type}):`, error)
		return res.status(500).json({ error: 'Failed to fetch data' })
	}
}
