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
import { formattedNum, getPercentChange, slug } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'
import metadataCache from '~/utils/metadata'
import type { IChainOverviewData, ILiteParentProtocol, ILiteProtocol, IProtocol, TVL_TYPES } from './types'
import { sumTvl, toFilterProtocol, toStrikeTvl } from './utils'

export async function getChainOverviewData({ chain }: { chain: string }): Promise<IChainOverviewData | null> {
	const metadata =
		chain === 'All'
			? { name: 'All', tvl: true, stablecoins: true, dexs: true }
			: metadataCache.chainMetadata[slug(chain)]

	if (!metadata) return null

	try {
		const [
			chartData,
			protocols,
			dexVolume,
			fees,
			revenue,
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
			IAdapterOverview | null,
			IAdapterOverview | null,
			IAdapterOverview | null,
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
			chain !== 'All' && metadata?.dexs
				? getAdapterOverview({
						type: 'dexs',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: Promise.resolve(null),
			chain !== 'All' && metadata?.chainFees
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
			chain !== 'All' && metadata?.chainFees
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

export const getProtocolsByChain = async ({ metadata, chain }: { chain: string; metadata: { name: string } }) => {
	const [{ protocols, chains, parentProtocols }]: [
		{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> }
	] = await Promise.all([fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json())])
	const finalProtocols: Record<string, IProtocol> = {}

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

			if (protocol.parentProtocol && metadataCache.protocolMetadata[protocol.parentProtocol]) {
				const parentTvl =
					protocol.tvl !== null
						? sumTvl(tvls, finalProtocols?.[protocol.parentProtocol]?.tvl ?? {})
						: finalProtocols?.[protocol.parentProtocol]?.tvl ?? null

				if (parentTvl && tvls.excludeParent) {
					parentTvl.default.tvl -= tvls.excludeParent.tvl ?? 0
					parentTvl.default.tvlPrevDay -= tvls.excludeParent.tvlPrevDay ?? 0
					parentTvl.default.tvlPrevWeek -= tvls.excludeParent.tvlPrevWeek ?? 0
					parentTvl.default.tvlPrevMonth -= tvls.excludeParent.tvlPrevMonth ?? 0
				}

				const parentTvlChange = parentTvl?.default?.tvl
					? {
							change1d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevDay),
							change7d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevWeek),
							change1m: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevMonth)
					  }
					: null

				finalProtocols[protocol.parentProtocol] = {
					name: metadataCache.protocolMetadata[protocol.parentProtocol].displayName,
					slug: metadataCache.protocolMetadata[protocol.parentProtocol].name,
					chains: Array.from(
						new Set([
							...(finalProtocols?.[protocol.parentProtocol]?.chains ?? []),
							...metadataCache.protocolMetadata[protocol.defillamaId].chains
						])
					),
					category: null,
					tvl: parentTvl,
					tvlFormatted: parentTvl ? `$${formattedNum(parentTvl.default.tvl || 0)}` : null,
					tvlChange: parentTvlChange,
					mcap: null,
					mcaptvl: null,
					strikeTvl: finalProtocols?.[protocol.parentProtocol]?.strikeTvl ? true : toStrikeTvl(protocol, {}),
					childProtocols: [
						...(finalProtocols?.[protocol.parentProtocol]?.childProtocols ?? []),
						{
							name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
							slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
							chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
							category: protocol.category ?? null,
							tvl: protocol.tvl != null ? tvls : null,
							tvlFormatted: protocol.tvl != null ? `$${formattedNum(tvls.default.tvl || 0)}` : null,
							tvlChange: protocol.tvl != null ? tvlChange : null,
							mcap: protocol.mcap ?? null,
							mcaptvl: protocol.mcap && tvls?.default?.tvl ? +(protocol.mcap / tvls.default.tvl).toFixed(2) : null,
							strikeTvl: toStrikeTvl(protocol, {})
						}
					]
				}
			} else {
				finalProtocols[protocol.defillamaId] = {
					name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
					slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
					chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
					category: protocol.category ?? null,
					tvl: protocol.tvl != null ? tvls : null,
					tvlFormatted: protocol.tvl != null ? `$${formattedNum(tvls.default.tvl || 0)}` : null,
					tvlChange: protocol.tvl != null ? tvlChange : null,
					mcap: protocol.mcap ?? null,
					mcaptvl: protocol.mcap && tvls?.default?.tvl ? +(protocol.mcap / tvls.default.tvl).toFixed(2) : null,
					strikeTvl: toStrikeTvl(protocol, {})
				}
			}
		}
	}

	for (const parentProtocol of parentProtocols) {
		if (finalProtocols[parentProtocol.id]) {
			finalProtocols[parentProtocol.id].mcap = parentProtocol.mcap ?? null
			finalProtocols[parentProtocol.id].mcaptvl =
				parentProtocol.mcap && finalProtocols[parentProtocol.id].tvl?.default?.tvl
					? +(parentProtocol.mcap / finalProtocols[parentProtocol.id].tvl.default.tvl).toFixed(2)
					: null
		}
	}

	return Object.values(finalProtocols).sort((a, b) => (b.tvl?.default?.tvl ?? 0) - (a.tvl?.default?.tvl ?? 0))
}
