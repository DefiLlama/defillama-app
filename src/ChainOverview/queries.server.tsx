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
import { getAdapterOverview, getCexVolume } from '~/DimensionAdapters/queries'
import { getPeggedOverviewPageData } from '~/Stablecoins/queries.server'
import { buildStablecoinChartData, getStablecoinDominance } from '~/Stablecoins/utils'
import { getPercentChange, slug } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'
import metadataCache, { type IChainMetadata, type IProtocolMetadata } from '~/utils/metadata'

export interface IChainOverviewData {
	chain: string
	metadata: IChainMetadata
	protocols: Record<string, IProtocol>
}

interface ILiteProtocol {
	category: string
	chains: Array<string>
	mcap: number
	name: string
	symbol: string
	logo: string
	url: string
	referralUrl: string
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	chainTvls: Record<
		string,
		{
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
	>
	defillamaId: string
	governanceID: Array<string>
	geckoId: string
	parentProtocol?: string
}

interface ILiteParentProtocol {
	id: string
	name: string
	url: string
	description: string
	logo: string
	chains: Array<string>
	gecko_id: string
	cmcId: string
	treasury: string
	twitter: string
	governanceID: Array<string>
	wrongLiquidity: boolean
	github: Array<string>
	mcap: number
}

interface IChildProtocol {
	name: string
	slug: string
	category: string | null
	tvl: Record<string, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> | null
	chains: Array<string>
}

interface IProtocol extends IChildProtocol {
	childProtocols?: Array<IChildProtocol>
}

export async function getChainOverviewData({ chain }: { chain: string }): Promise<IChainOverviewData | null> {
	const metadata =
		chain === 'All'
			? { name: 'All', tvl: true, stablecoins: true, dexs: true }
			: metadataCache.chainMetadata[slug(chain)]

	if (!metadata) return null

	try {
		const [
			chartData,
			{ protocols, chains, parentProtocols },
			dexVolume,
			cexVolume,
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
			{ totalAppRevenue24h }
		]: [
			any,
			{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any
		] = await Promise.all([
			fetchWithErrorLogging(`${CHART_API}${chain === 'All' ? '' : `/${metadata.name}`}`).then((r) => r.json()),
			fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
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
				: null,
			,
			getCexVolume(),
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
				: null,
			chain !== 'All' && metadata?.chainFees
				? getAdapterOverview({
						type: 'dexs',
						chain: metadata.name,
						excludeTotalDataChart: true,
						excludeTotalDataChartBreakdown: true,
						dataType: 'dailyRevenue'
				  }).catch((err) => {
						console.log(err)
						return null
				  })
				: null,
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
				? null
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
				? null
				: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			chain === 'All' || !metadata?.activeUsers
				? null
				: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),

			chain === 'All' || !metadata?.activeUsers
				? null
				: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${metadata.name}`)
						.then((res) => res.json())
						.then((data) => data?.[data?.length - 1]?.[1] ?? null)
						.catch(() => null),
			fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
			chain === 'All' ? null : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
			metadata?.gecko_id
				? fetchWithErrorLogging(
						`https://pro-api.coingecko.com/api/v3/coins/${metadata?.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
				  ).then((res) => res.json())
				: {},
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
				: null,
			chain && chain !== 'All'
				? fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
				: null,
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
				: null
		])

		const finalProtocols: Record<string, IProtocol> = {}

		for (const protocol of protocols) {
			if (
				metadataCache.protocolMetadata[protocol.defillamaId] &&
				toFilterProtocol({
					protocol: metadataCache.protocolMetadata[protocol.defillamaId],
					chainDisplayName: metadata.name
				})
			) {
				const tvls: Record<string, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> = {}

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

				for (const chainKey in protocol.chainTvls ?? {}) {
					if (chain === 'All') {
						if (DEFI_SETTINGS_KEYS.includes(chainKey) || chainKey === 'excludeParent') {
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
						tvl:
							protocol.tvl !== null
								? sumTvl(tvls, finalProtocols?.[protocol.parentProtocol]?.tvl ?? {})
								: finalProtocols?.[protocol.parentProtocol]?.tvl ?? null,
						childProtocols: [
							...(finalProtocols?.[protocol.parentProtocol]?.childProtocols ?? []),
							{
								name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
								slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
								chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
								category: protocol.category ?? null,
								tvl: protocol.tvl != null ? tvls : null
							}
						]
					}
				} else {
					finalProtocols[protocol.defillamaId] = {
						name: metadataCache.protocolMetadata[protocol.defillamaId].displayName,
						slug: metadataCache.protocolMetadata[protocol.defillamaId].name,
						chains: metadataCache.protocolMetadata[protocol.defillamaId].chains,
						category: protocol.category ?? null,
						tvl: protocol.tvl != null ? tvls : null
					}
				}
			}
		}

		return { chain, metadata, protocols: finalProtocols }
	} catch (error) {
		const msg = `Error fetching ${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.log(msg)
		throw new Error(msg)
	}
}

const toFilterProtocol = ({
	protocol,
	chainDisplayName
}: {
	protocol: IProtocolMetadata
	chainDisplayName: string | null
}): boolean => {
	return protocol.name &&
		!protocol.name.startsWith('chain#') &&
		protocol.displayName &&
		protocol.chains &&
		(chainDisplayName !== 'All' ? protocol.chains.includes(chainDisplayName) : true)
		? true
		: false
}

const sumTvl = (childTvl, parentTvl) => {
	const final = { ...parentTvl }
	for (const tvlKey in childTvl) {
		final[tvlKey] = {
			tvl: (parentTvl?.[tvlKey]?.tvl ?? 0) + (childTvl?.[tvlKey]?.tvl ?? 0),
			tvlPrevDay: (parentTvl?.[tvlKey]?.tvlPrevDay ?? 0) + (childTvl?.[tvlKey]?.tvlPrevDay ?? 0),
			tvlPrevWeek: (parentTvl?.[tvlKey]?.tvlPrevWeek ?? 0) + (childTvl?.[tvlKey]?.tvlPrevWeek ?? 0),
			tvlPrevMonth: (parentTvl?.[tvlKey]?.tvlPrevMonth ?? 0) + (childTvl?.[tvlKey]?.tvlPrevMonth ?? 0)
		}
	}
	return final
}
