import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELD_CHART_API, YIELD_CHART_LEND_BORROW_API } from '~/constants'
import { sanitizeRowHeaders } from '~/containers/ProDashboard/components/UnifiedTable/utils/rowHeaders'
import { getChartQueryKey } from '~/containers/ProDashboard/queries'
import {
	extractChartItems,
	extractYieldsItems,
	fetchAppMetadata,
	fetchDashboardConfig,
	fetchProtocolsAndChains,
	fetchSingleChartData,
	withTimeout
} from '~/containers/ProDashboard/queries.server'
import { fetchTableServerData } from '~/containers/ProDashboard/server/tableQueries'
import ProtocolCharts from '~/containers/ProDashboard/services/ProtocolCharts'
import type {
	AdvancedTvlChartConfig,
	ChartConfig,
	MetricConfig,
	StablecoinsChartConfig,
	UnifiedTableConfig,
	UnlocksPieConfig,
	UnlocksScheduleConfig
} from '~/containers/ProDashboard/types'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import {
	fetchStablecoinAssetsApi,
	fetchStablecoinChartApi,
	fetchStablecoinPricesApi,
	fetchStablecoinRatesApi
} from '~/containers/Stablecoins/api'
import { formatPeggedAssetsData } from '~/containers/Stablecoins/utils'
import { getProtocolEmissionsPieData, getProtocolEmissionsScheduleData } from '~/containers/Unlocks/queries'
import { fetchProtocolsTable } from '~/server/unifiedTable/protocols'
import { slug } from '~/utils'

export const config = {
	api: { responseLimit: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.status(405).end()
		return
	}

	const dashboardId = req.query.dashboardId as string
	if (!dashboardId) {
		res.status(400).end()
		return
	}

	const authToken = req.cookies['pb_auth_token'] ?? null

	// Set streaming headers
	res.setHeader('Content-Type', 'application/x-ndjson')
	res.setHeader('X-Accel-Buffering', 'no')
	res.setHeader(
		'Cache-Control',
		authToken ? 'private, no-cache, no-store, must-revalidate' : 'public, s-maxage=300, stale-while-revalidate=3600'
	)

	const writeLine = (chunk: object) => {
		if (res.destroyed) return
		try {
			res.write(JSON.stringify(chunk) + '\n')
		} catch {}
	}

	try {
		// Phase 1: fetch dashboard config, protocols/chains, and app metadata in parallel
		// Stream each result as it resolves
		let dashboard: Awaited<ReturnType<typeof fetchDashboardConfig>> = null
		let protocolsAndChainsData: Awaited<ReturnType<typeof fetchProtocolsAndChains>> = null

		const [dashboardResult, protocolsResult] = await Promise.allSettled([
			fetchDashboardConfig(dashboardId, authToken).then((d) => {
				writeLine({ type: 'dashboard', data: d })
				dashboard = d
				return d
			}),
			fetchProtocolsAndChains().then((d) => {
				writeLine({ type: 'protocolsAndChains', data: d })
				protocolsAndChainsData = d
				return d
			}),
			fetchAppMetadata().then((d) => {
				writeLine({ type: 'appMetadata', data: d })
				return d
			})
		])

		if (dashboardResult.status === 'rejected') dashboard = null
		if (protocolsResult.status === 'rejected') protocolsAndChainsData = null

		const items = dashboard?.data?.items
		if (!items?.length) {
			writeLine({ type: 'done' })
			res.end()
			return
		}

		// Phase 2: fire all item-level fetches in parallel, stream each as it resolves
		const phase2Promises: Promise<void>[] = []

		// Charts — stream each chart individually
		const chartItems = extractChartItems(items)
		for (const chart of chartItems) {
			phase2Promises.push(
				withTimeout(fetchSingleChartData(chart, 'all', null), 10_000)
					.then((data) => {
						const itemType = chart.protocol ? 'protocol' : 'chain'
						const item = chart.protocol || chart.chain
						const queryKey = [
							'pro-dashboard',
							...getChartQueryKey(chart.type, itemType, item, chart.geckoId, undefined, undefined, chart.dataType),
							chart.grouping,
							chart.id
						]
						writeLine({ type: 'chartData', id: chart.id, queryKey, data: Array.isArray(data) ? data : [] })
					})
					.catch(() => {
						const itemType = chart.protocol ? 'protocol' : 'chain'
						const item = chart.protocol || chart.chain
						const queryKey = [
							'pro-dashboard',
							...getChartQueryKey(chart.type, itemType, item, chart.geckoId, undefined, undefined, chart.dataType),
							chart.grouping,
							chart.id
						]
						writeLine({ type: 'chartData', id: chart.id, queryKey, data: [] })
					})
			)
		}

		// Table data — single chunk
		phase2Promises.push(
			fetchTableServerData(items)
				.then((data) => {
					if (data) writeLine({ type: 'tableData', data })
				})
				.catch(() => {})
		)

		// Yields — stream per pool
		const yieldsItems = extractYieldsItems(items)
		const uniquePoolIds = new Set<string>()
		for (const item of yieldsItems) uniquePoolIds.add(item.poolConfigId)
		for (const poolConfigId of uniquePoolIds) {
			phase2Promises.push(
				(async () => {
					const [chartResult, lendBorrowResult] = await Promise.allSettled([
						withTimeout(
							fetch(`${YIELD_CHART_API}/${poolConfigId}`).then((r) => (r.ok ? r.json() : null)),
							10_000
						),
						withTimeout(
							fetch(`${YIELD_CHART_LEND_BORROW_API}/${poolConfigId}`).then((r) => (r.ok ? r.json() : null)),
							10_000
						)
					])
					writeLine({
						type: 'yieldsChartData',
						id: poolConfigId,
						data: {
							chart: chartResult.status === 'fulfilled' ? chartResult.value : null,
							lendBorrow: lendBorrowResult.status === 'fulfilled' ? lendBorrowResult.value : null
						}
					})
				})().catch(() => {})
			)
		}

		// Protocol full data — stream per protocol
		const protocolFullDataSlugs = new Set<string>()
		for (const item of items) {
			if (item.kind === 'advanced-tvl') protocolFullDataSlugs.add(item.protocol)
			else if (item.kind === 'advanced-borrowed') protocolFullDataSlugs.add(item.protocol)
		}
		for (const protocol of protocolFullDataSlugs) {
			phase2Promises.push(
				withTimeout(
					fetchProtocolBySlug(protocol).catch(() => null),
					15_000
				)
					.then((data) => {
						if (data) writeLine({ type: 'protocolFullData', id: protocol, data })
					})
					.catch(() => {})
			)
		}

		// Metric data — stream per metric
		const metricItems = items.filter((item): item is MetricConfig => item.kind === 'metric')
		const protocols = protocolsAndChainsData?.protocols ?? []
		const chains = protocolsAndChainsData?.chains ?? []
		for (const metric of metricItems) {
			phase2Promises.push(
				(async () => {
					const item =
						metric.subject.itemType === 'protocol' ? metric.subject.protocol || '' : metric.subject.chain || ''
					if (!item) return

					const geckoId =
						metric.subject.geckoId ??
						(metric.subject.itemType === 'protocol'
							? (protocols.find((p: any) => p.slug === item)?.geckoId as string | undefined)
							: (chains.find((c: any) => c.name === item)?.gecko_id as string | undefined)) ??
						null

					const chartConfig: ChartConfig = {
						id: `metric-${metric.id}`,
						kind: 'chart',
						type: metric.type,
						protocol: metric.subject.itemType === 'protocol' ? item : '',
						chain: metric.subject.itemType === 'chain' ? item : '',
						geckoId
					}

					const data = await withTimeout(fetchSingleChartData(chartConfig, 'all', null), 15_000)
					const keyParts = [
						'pro-dashboard',
						'metric',
						...getChartQueryKey(metric.type, metric.subject.itemType, item, geckoId)
					]
					if (data?.length) {
						writeLine({ type: 'metricData', key: JSON.stringify(keyParts), data })
					}
				})().catch(() => {})
			)
		}

		// Advanced TVL basic data — stream per protocol
		const advTvlProtocols = new Set<string>()
		for (const item of items) {
			if (item.kind === 'advanced-tvl' && (item as AdvancedTvlChartConfig).chartType === 'tvl') {
				advTvlProtocols.add((item as AdvancedTvlChartConfig).protocol)
			}
		}
		for (const protocol of advTvlProtocols) {
			phase2Promises.push(
				withTimeout(ProtocolCharts.tvl(protocol), 10_000)
					.then((data) => {
						writeLine({ type: 'advancedTvlBasicData', id: protocol, data: data ?? [] })
					})
					.catch(() => {})
			)
		}

		// Unified table data — stream per config
		const unifiedTableItems = items.filter((item): item is UnifiedTableConfig => item.kind === 'unified-table')
		for (const utConfig of unifiedTableItems) {
			phase2Promises.push(
				(async () => {
					const headers = sanitizeRowHeaders(utConfig.rowHeaders)
					const paramsChains = utConfig.params?.chains ?? []
					const paramsKey = JSON.stringify({ chains: paramsChains })
					const headersKey = headers.join('|')
					const cacheKey = JSON.stringify(['pro-dashboard', 'unified-table', paramsKey, headersKey])
					const data = await withTimeout(fetchProtocolsTable({ config: utConfig, rowHeaders: headers }), 15_000)
					if (data) writeLine({ type: 'unifiedTableData', key: cacheKey, data })
				})().catch(() => {})
			)
		}

		// Stablecoins chart data — shared baseline then per-chain
		const stablecoinsItems = items.filter((item): item is StablecoinsChartConfig => item.kind === 'stablecoins')
		if (stablecoinsItems.length > 0) {
			phase2Promises.push(
				(async () => {
					const FETCH_TIMEOUT = 10_000
					try {
						const [peggedData, priceData, rateData] = await Promise.all([
							withTimeout(fetchStablecoinAssetsApi(), FETCH_TIMEOUT),
							withTimeout(fetchStablecoinPricesApi(), FETCH_TIMEOUT),
							withTimeout(fetchStablecoinRatesApi(), FETCH_TIMEOUT)
						])

						const { peggedAssets } = peggedData
						const uniqueChains = new Set<string>()
						for (const item of stablecoinsItems) uniqueChains.add(item.chain)

						const chainPromises: Promise<void>[] = []
						for (const chain of uniqueChains) {
							chainPromises.push(
								(async () => {
									const chainLabel = chain === 'All' ? 'all-llama-app' : chain
									const chainData = await withTimeout(fetchStablecoinChartApi(chainLabel), FETCH_TIMEOUT)
									const breakdown = chainData?.breakdown
									if (!breakdown) return

									let chartDataByPeggedAsset: any[] = []
									let peggedNameToChartDataIndex: Record<string, number> = {}
									let lastTimestamp = 0

									chartDataByPeggedAsset = peggedAssets.map((elem: any, i: number) => {
										peggedNameToChartDataIndex[elem.name] = i
										const charts = breakdown[elem.id] ?? []
										const formattedCharts = charts
											.map((chart: any) => ({ date: chart.date, mcap: chart.totalCirculatingUSD }))
											.filter((chartPoint: any) => chartPoint.mcap !== undefined)

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
										if ((peggedAssets[idx] as unknown as { doublecounted?: boolean }).doublecounted) {
											doublecountedIds.push(idx)
										}
									}

									writeLine({
										type: 'stablecoinsChartData',
										chain,
										data: {
											chartDataByPeggedAsset,
											peggedAssetNames,
											peggedNameToChartDataIndex,
											filteredPeggedAssets,
											doublecountedIds
										}
									})
								})().catch(() => {})
							)
						}
						await Promise.allSettled(chainPromises)
					} catch {}
				})()
			)
		}

		// RWA overview chart data — stream per unique breakdown+metric+chain combo
		const rwaOverviewItems = items.filter((item: any) => item.kind === 'rwa-overview')
		const rwaAssetItems = items.filter((item: any) => item.kind === 'rwa-asset')

		if (rwaOverviewItems.length > 0 || rwaAssetItems.length > 0) {
			const rwaApi = await import('~/containers/RWA/api')

			const seenOverviewKeys = new Set<string>()
			for (const item of rwaOverviewItems) {
				const { breakdown, metric, chain } = item as any
				const resolvedChain = chain || 'All'
				const cacheKey = JSON.stringify([breakdown, metric, resolvedChain])
				if (seenOverviewKeys.has(cacheKey)) continue
				seenOverviewKeys.add(cacheKey)

				phase2Promises.push(
					(async () => {
						let data: any = null
						if (resolvedChain !== 'All') {
							const assetData = await withTimeout(
								rwaApi.fetchRWAChartDataByAsset({
									target: { kind: 'chain', slug: resolvedChain },
									includeStablecoins: false,
									includeGovernance: false
								}),
								10_000
							)
							if (assetData) {
								const rows = (assetData as any)[metric || 'activeMcap'] ?? null
								if (rows) {
									data = rows.map((row: any) => ({
										...row,
										timestamp: rwaApi.toUnixMsTimestamp(Number(row.timestamp))
									}))
								}
							}
						} else {
							const breakdownParams = {
								key: metric || 'activeMcap',
								includeStablecoin: false,
								includeGovernance: false
							}
							switch (breakdown) {
								case 'category':
									data = await withTimeout(rwaApi.fetchRWACategoryBreakdownChartData(breakdownParams), 10_000)
									break
								case 'platform':
									data = await withTimeout(rwaApi.fetchRWAPlatformBreakdownChartData(breakdownParams), 10_000)
									break
								case 'assetGroup':
									data = await withTimeout(rwaApi.fetchRWAAssetGroupBreakdownChartData(breakdownParams), 10_000)
									break
								default:
									data = await withTimeout(rwaApi.fetchRWAChainBreakdownChartData(breakdownParams), 10_000)
									break
							}
						}
						if (data) {
							writeLine({
								type: 'rwaBreakdownData',
								breakdown: breakdown || 'chain',
								metric: metric || 'activeMcap',
								chain: resolvedChain,
								data
							})
						}
					})().catch(() => {})
				)
			}

			const seenAssetIds = new Set<string>()
			for (const item of rwaAssetItems) {
				const { assetId } = item as any
				if (!assetId || seenAssetIds.has(assetId)) continue
				seenAssetIds.add(assetId)

				phase2Promises.push(
					withTimeout(rwaApi.fetchRWAAssetChartData(assetId), 10_000)
						.then((data) => {
							if (data) writeLine({ type: 'rwaAssetChartData', id: assetId, data })
						})
						.catch(() => {})
				)
			}
		}

		// RWA table data — stream assets list and/or stats
		const hasRwaAssetsTable = items.some(
			(item: any) => item.kind === 'table' && (item.datasetType === 'rwa' || item.datasetType === 'rwa-selected-chain')
		)
		const hasRwaChainsTable = items.some((item: any) => item.kind === 'table' && item.datasetType === 'rwa-chains')
		const rwaSelectedChainItems = items.filter(
			(item: any) => item.kind === 'table' && item.datasetType === 'rwa-selected-chain'
		)

		if (hasRwaAssetsTable || rwaSelectedChainItems.length > 0) {
			phase2Promises.push(
				(async () => {
					const { fetchRWAActiveTVLs: fetchAssets } = await import('~/containers/RWA/api')
					const data = await withTimeout(fetchAssets(), 10_000)
					if (data) {
						writeLine({ type: 'rwaAssetsTableData', data })
						for (const item of rwaSelectedChainItems) {
							const chain = (item as any).datasetChain
							if (chain) {
								writeLine({ type: 'rwaChainAssetsTableData', chain, data })
							}
						}
					}
				})().catch(() => {})
			)
		}

		if (hasRwaChainsTable) {
			phase2Promises.push(
				(async () => {
					const { fetchRWAStats: fetchStats } = await import('~/containers/RWA/api')
					const data = await withTimeout(fetchStats(), 10_000)
					if (data) {
						writeLine({ type: 'rwaChainsTableData', data })
					}
				})().catch(() => {})
			)
		}

		// Equities table data — stream companies list, statements, and filings
		const hasEquitiesCompaniesTable = items.some(
			(item: any) => item.kind === 'table' && item.datasetType === 'equities'
		)
		const equitiesFinancialsItems = items.filter(
			(item: any) => item.kind === 'table' && item.datasetType === 'equities-financials'
		)
		const equitiesFilingsItems = items.filter(
			(item: any) => item.kind === 'table' && item.datasetType === 'equities-filings'
		)

		if (hasEquitiesCompaniesTable) {
			phase2Promises.push(
				(async () => {
					const { fetchEquitiesCompanies } = await import('~/containers/Equities/api')
					const data = await withTimeout(fetchEquitiesCompanies(), 15_000)
					if (data) {
						writeLine({ type: 'equitiesCompaniesData', data })
					}
				})().catch(() => {})
			)
		}

		const seenEquitiesStatementsTickers = new Set<string>()
		for (const item of equitiesFinancialsItems) {
			const ticker = (item as any).datasetChain
			if (ticker && !seenEquitiesStatementsTickers.has(ticker)) {
				seenEquitiesStatementsTickers.add(ticker)
				phase2Promises.push(
					(async () => {
						const { fetchEquitiesStatements } = await import('~/containers/Equities/api')
						const data = await withTimeout(fetchEquitiesStatements(ticker), 15_000)
						if (data) {
							writeLine({ type: 'equitiesStatementsData', ticker, data })
						}
					})().catch(() => {})
				)
			}
		}

		const seenEquitiesFilingsTickers = new Set<string>()
		for (const item of equitiesFilingsItems) {
			const ticker = (item as any).datasetChain
			if (ticker && !seenEquitiesFilingsTickers.has(ticker)) {
				seenEquitiesFilingsTickers.add(ticker)
				phase2Promises.push(
					(async () => {
						const { fetchEquitiesFilings } = await import('~/containers/Equities/api')
						const data = await withTimeout(fetchEquitiesFilings(ticker), 15_000)
						if (data) {
							writeLine({ type: 'equitiesFilingsData', ticker, data })
						}
					})().catch(() => {})
				)
			}
		}

		// Emission data — stream per task
		const emissionTasks: Array<{
			key: string
			fn: () => Promise<any>
		}> = []
		const seenPieKeys = new Set<string>()
		const seenScheduleKeys = new Set<string>()
		for (const item of items) {
			if (item.kind === 'unlocks-pie') {
				const unlocksPieConfig = item as UnlocksPieConfig
				const cacheKey = JSON.stringify(['pro-dashboard', 'unlocks-pie', unlocksPieConfig.protocol])
				if (!seenPieKeys.has(cacheKey)) {
					seenPieKeys.add(cacheKey)
					emissionTasks.push({
						key: cacheKey,
						fn: () => withTimeout(getProtocolEmissionsPieData(slug(unlocksPieConfig.protocol)), 10_000)
					})
				}
			} else if (item.kind === 'unlocks-schedule') {
				const unlocksScheduleConfig = item as UnlocksScheduleConfig
				const resolvedDataType =
					unlocksScheduleConfig.dataType === 'realtime' ? 'documented' : unlocksScheduleConfig.dataType
				const cacheKey = JSON.stringify([
					'pro-dashboard',
					'unlocks-schedule',
					unlocksScheduleConfig.protocol,
					resolvedDataType
				])
				if (!seenScheduleKeys.has(cacheKey)) {
					seenScheduleKeys.add(cacheKey)
					emissionTasks.push({
						key: cacheKey,
						fn: () => withTimeout(getProtocolEmissionsScheduleData(slug(unlocksScheduleConfig.protocol)), 10_000)
					})
				}
			}
		}
		for (const task of emissionTasks) {
			phase2Promises.push(
				task
					.fn()
					.then((data) => {
						if (data) writeLine({ type: 'emissionData', key: task.key, data })
					})
					.catch(() => {})
			)
		}

		// Wait for all Phase 2 fetches to complete
		await Promise.allSettled(phase2Promises)

		writeLine({ type: 'done' })
		res.end()
	} catch {
		if (!res.destroyed) {
			writeLine({ type: 'done' })
			res.end()
		}
	}
}
