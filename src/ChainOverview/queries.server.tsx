import { getBridgeOverviewPageData } from '~/Bridges/queries.server'
import {
	CHAINS_ASSETS,
	CHART_API,
	PROTOCOLS_API,
	PROTOCOLS_TREASURY,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	RAISES_API
} from '~/constants'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getAdapterOverview, IAdapterOverview } from '~/DimensionAdapters/queries'
import { getPeggedOverviewPageData } from '~/Stablecoins/queries.server'
import { buildStablecoinChartData, getStablecoinDominance } from '~/Stablecoins/utils'
import { getPercentChange, slug } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'
import metadataCache from '~/utils/metadata'
import type {
	IChainMetadata,
	IChainOverviewData,
	IChildProtocol,
	ILiteParentProtocol,
	ILiteProtocol,
	IProtocol,
	TVL_TYPES
} from './types'
import { toFilterProtocol, toStrikeTvl } from './utils'
import { getAnnualizedRatio } from '~/api/categories/adaptors'

export async function getChainOverviewData({ chain }: { chain: string }): Promise<IChainOverviewData | null> {
	const metadata =
		chain === 'All'
			? { name: 'All', tvl: true, stablecoins: true, fees: true, dexs: true }
			: metadataCache.chainMetadata[slug(chain)]

	if (!metadata) return null

	try {
		const [
			chartData,
			protocols,
			stablecoinsData,
			inflowsData,
			activeUsers,
			transactions,
			newUsers,
			raisesData,
			treasuriesData,
			cgData,
			perpsData,
			nftVolumesData,
			chainAssets,
			appRevenue
		]: [
			any,
			Array<IProtocol>,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			IAdapterOverview | null,
			any,
			any,
			number | null
		] = await Promise.all([
			fetchWithErrorLogging(`${CHART_API}${chain === 'All' ? '' : `/${metadata.name}`}`).then((r) => r.json()),
			getProtocolsByChain({ chain, metadata }),
			getPeggedOverviewPageData(chain === 'All' ? null : metadata.name)
				.then((data) => {
					const { peggedAreaChartData, peggedAreaTotalData } = buildStablecoinChartData({
						chartDataByAssetOrChain: data?.chartDataByPeggedAsset,
						assetsOrChainsList: data?.peggedAssetNames,
						filteredIndexes: Object.values(data?.peggedNameToChartDataIndex || {}),
						issuanceType: 'mcap',
						selectedChain: chain === 'All' ? 'All' : metadata.name,
						doublecountedIds: data?.doublecountedIds
					})
					let totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap
					let totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap
					const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2)

					let topToken = { symbol: 'USDT', mcap: 0 }

					if (peggedAreaChartData && peggedAreaChartData.length > 0) {
						const recentMcaps = peggedAreaChartData[peggedAreaChartData.length - 1]

						for (const token in recentMcaps) {
							if (token !== 'date' && recentMcaps[token] > topToken.mcap) {
								topToken = { symbol: token, mcap: recentMcaps[token] }
							}
						}
					}

					const dominance = getStablecoinDominance(topToken, totalMcapCurrent)

					return {
						mcap: totalMcapCurrent ?? null,
						change7d: percentChange ?? null,
						topToken,
						dominance: dominance ?? null
					}
				})
				.catch((err) => {
					console.log('ERROR fetching stablecoins data of chain', metadata.name, err)
					return {}
				}),
			chain === 'All' || !metadata?.inflows
				? Promise.resolve(null)
				: getBridgeOverviewPageData(metadata.name)
						.then((data) => {
							return {
								netInflows: data?.chainVolumeData?.length
									? data.chainVolumeData[data.chainVolumeData.length - 1]['Deposits']
									: null
							}
						})
						.catch(() => null),
			chain === 'All' || !metadata?.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			chain === 'All' || !metadata?.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			chain === 'All' || !metadata?.activeUsers
				? Promise.resolve(null)
				: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
			chain === 'All' ? Promise.resolve(null) : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
			metadata?.gecko_id
				? fetchWithErrorLogging(
						`https://pro-api.coingecko.com/api/v3/coins/${metadata?.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
				  ).then((res) => res.json())
				: Promise.resolve({}),
			chain && chain !== 'All' && metadata?.derivatives
				? getAdapterOverview({
						type: 'derivatives',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			chain && chain !== 'All'
				? fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
				: Promise.resolve(null),
			fetchWithErrorLogging(CHAINS_ASSETS)
				.then((res) => res.json())
				.catch(() => ({})),
			chain && chain !== 'All' && metadata?.fees
				? getAdapterOverview({
						type: 'fees',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true,
						dataType: 'dailyAppRevenue'
				  })
						.then((data) => {
							return data?.total24h ?? null
						})
						.catch((err) => {
							console.log(err)
							return null
						})
				: Promise.resolve(null)
		])

		return {
			chain,
			metadata,
			protocols
		}
	} catch (error) {
		const msg = `Error fetching ${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.log(msg)
		throw new Error(msg)
	}
}

export const getProtocolsByChain = async ({ metadata, chain }: { chain: string; metadata: IChainMetadata }) => {
	const [{ protocols, parentProtocols }, fees, revenue, dexs]: [
		{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null
	] = await Promise.all([
		fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		metadata?.fees
			? getAdapterOverview({
					type: 'fees',
					chain: metadata.name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null),
		metadata?.fees
			? getAdapterOverview({
					type: 'fees',
					chain: metadata.name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyRevenue'
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null),
		metadata?.dexs
			? getAdapterOverview({
					type: 'dexs',
					chain: metadata.name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
			  }).catch((err) => {
					console.log(err)
					return null
			  })
			: Promise.resolve(null)
	])

	const dimensionProtocols = {}

	for (const protocol of fees?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				fees: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					average1y: protocol.average1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of revenue?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				revenue: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					average1y: protocol.average1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	const finalProtocols: Record<string, IProtocol> = {}

	const parentStore: Record<string, Array<IChildProtocol>> = {}

	for (const protocol of protocols) {
		if (
			metadataCache.protocolMetadata[protocol.defillamaId] &&
			toFilterProtocol({
				protocolMetadata: metadataCache.protocolMetadata[protocol.defillamaId],
				protocolData: protocol,
				chainDisplayName: metadata.name
			})
		) {
			const tvls = {} as Record<
				TVL_TYPES,
				{ tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
			>

			if (chain === 'All') {
				tvls.default = {
					tvl: protocol.tvl ?? null,
					tvlPrevDay: protocol.tvlPrevDay ?? null,
					tvlPrevWeek: protocol.tvlPrevWeek ?? null,
					tvlPrevMonth: protocol.tvlPrevMonth ?? null
				}
			} else {
				tvls.default = {
					tvl: protocol?.chainTvls?.[metadata.name]?.tvl ?? null,
					tvlPrevDay: protocol?.chainTvls?.[metadata.name]?.tvlPrevDay ?? null,
					tvlPrevWeek: protocol?.chainTvls?.[metadata.name]?.tvlPrevWeek ?? null,
					tvlPrevMonth: protocol?.chainTvls?.[metadata.name]?.tvlPrevMonth ?? null
				}
			}

			const tvlChange = tvls.default.tvl
				? {
						change1d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevDay),
						change7d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevWeek),
						change1m: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevMonth)
				  }
				: null

			for (const chainKey in protocol.chainTvls ?? {}) {
				if (chain === 'All') {
					if (DEFI_SETTINGS_KEYS.includes(chainKey as any) || chainKey === 'excludeParent') {
						tvls[chainKey] = {
							tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
							tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
							tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
							tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
						}
					}
				} else {
					if (chainKey.startsWith(`${metadata.name}-`)) {
						const tvlKey = chainKey.split('-')[1]
						tvls[tvlKey] = {
							tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
							tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
							tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
							tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
						}
					}
				}
			}

			const childStore: IChildProtocol = {
				name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
				slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
				chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
				category: protocol.category ?? null,
				tvl: protocol.tvl != null ? tvls : null,
				tvlChange: protocol.tvl != null ? tvlChange : null,
				mcap: protocol.mcap ?? null,
				mcaptvl: protocol.mcap && tvls?.default?.tvl ? +(protocol.mcap / tvls.default.tvl).toFixed(2) : null,
				strikeTvl: toStrikeTvl(protocol, {})
			}

			if (dimensionProtocols[protocol.defillamaId]?.fees) {
				childStore.fees = dimensionProtocols[protocol.defillamaId].fees
				childStore.fees.pf = protocol.mcap
					? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].fees.total30d)
					: null
			}

			if (dimensionProtocols[protocol.defillamaId]?.fees) {
				childStore.revenue = dimensionProtocols[protocol.defillamaId].revenue
				childStore.revenue.ps = protocol.mcap
					? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].revenue.total30d)
					: null
			}

			if (protocol.parentProtocol && metadataCache.protocolMetadata[protocol.parentProtocol]) {
				parentStore[protocol.parentProtocol] = [...(parentStore?.[protocol.parentProtocol] ?? []), childStore]
			} else {
				finalProtocols[protocol.defillamaId] = childStore
			}
		}
	}

	for (const parentProtocol of parentProtocols) {
		if (parentStore[parentProtocol.id]) {
			const parentTvl = parentStore[parentProtocol.id].some((child) => child.tvl !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.tvl ?? {}) {
							if (!acc[key1]) {
								acc[key1] = {}
							}
							for (const key2 in curr.tvl[key1]) {
								acc[key1][key2] = (acc[key1][key2] ?? 0) + curr.tvl[key1][key2]
							}
						}
						return acc
				  }, {} as IChildProtocol['tvl'])
				: null

			const parentFees = parentStore[parentProtocol.id].some((child) => child.fees !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.fees ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.fees[key1]
						}
						return acc
				  }, {} as IChildProtocol['fees'])
				: null

			if (parentFees) {
				parentFees.pf = getAnnualizedRatio(parentProtocol.mcap, parentFees.total30d)
			}

			const parentRevenue = parentStore[parentProtocol.id].some((child) => child.fees !== null)
				? parentStore[parentProtocol.id].reduce((acc, curr) => {
						for (const key1 in curr.fees ?? {}) {
							acc[key1] = (acc[key1] ?? 0) + curr.fees[key1]
						}
						return acc
				  }, {} as IChildProtocol['revenue'])
				: null

			if (parentRevenue) {
				parentRevenue.ps = getAnnualizedRatio(parentProtocol.mcap, parentRevenue.total30d)
			}

			if (parentTvl?.excludeParent) {
				parentTvl.default.tvl -= parentTvl.excludeParent.tvl ?? 0
				parentTvl.default.tvlPrevDay -= parentTvl.excludeParent.tvlPrevDay ?? 0
				parentTvl.default.tvlPrevWeek -= parentTvl.excludeParent.tvlPrevWeek ?? 0
				parentTvl.default.tvlPrevMonth -= parentTvl.excludeParent.tvlPrevMonth ?? 0
			}

			const parentTvlChange = parentTvl?.default?.tvl
				? {
						change1d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevDay),
						change7d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevWeek),
						change1m: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevMonth)
				  }
				: null

			finalProtocols[parentProtocol.id] = {
				name: metadataCache.protocolMetadata[parentProtocol.id].displayName,
				slug: metadataCache.protocolMetadata[parentProtocol.id].name,
				category: null,
				childProtocols: parentStore[parentProtocol.id],
				chains: Array.from(new Set(...parentStore[parentProtocol.id].map((p) => p.chains ?? []))),
				tvl: parentTvl,
				tvlChange: parentTvlChange,
				strikeTvl: parentStore[parentProtocol.id].some((child) => child.strikeTvl),
				mcap: parentProtocol.mcap ?? null,
				mcaptvl:
					parentProtocol.mcap && parentTvl?.default?.tvl
						? +(parentProtocol.mcap / parentTvl.default.tvl).toFixed(2)
						: null
			}

			if (parentFees) {
				finalProtocols[parentProtocol.id].fees = parentFees
			}
			if (parentRevenue) {
				finalProtocols[parentProtocol.id].revenue = parentRevenue
			}
		}
	}

	return Object.values(finalProtocols).sort((a, b) => (b.tvl?.default?.tvl ?? 0) - (a.tvl?.default?.tvl ?? 0))
}
