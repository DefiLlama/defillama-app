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
import { fetchWithErrorLogging } from '~/utils/async'
import metadataCache, { type IChainMetadata, type IProtocolMetadata } from '~/utils/metadata'

interface IChainOverviewData {
	chain: string
	metadata: IChainMetadata
}

export async function getChainOverviewData({
	chain,
	metadata
}: {
	chain: string
	metadata: IChainMetadata
}): Promise<IChainOverviewData> {
	getProtocolsMetadataByChain({ chainDisplayName: metadata.name })

	try {
		// const [
		// 	chartData,
		// 	{ protocols, chains, parentProtocols },
		// 	volume,
		// 	cexVolume,
		// 	{ fees, revenue },
		// 	stablecoinsData,
		// 	inflowsData,
		// 	activeUsers,
		// 	transactions,
		// 	newUsers,
		// 	raisesData,
		// 	treasuriesData,
		// 	cgData,
		// 	perpsData,
		// 	nftVolumesData,
		// 	chainAssets,
		// 	{ totalAppRevenue24h }
		// ] = await Promise.all([
		// 	fetchWithErrorLogging(`${CHART_API}${chain === 'All' ? '' : `/${metadata.name}`}`).then((r) => r.json()),
		// 	fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		// 	chain !== 'All' && metadata?.dexs
		// 		? getDexVolumeByChain({
		// 				chain: metadata.name,
		// 				excludeTotalDataChart: true,
		// 				excludeTotalDataChartBreakdown: true
		// 		  })
		// 		: null,
		// 	getCexVolume(),
		// 	chain !== 'All' && metadata?.chainFees
		// 		? getFeesAndRevenueByChain({
		// 				chain: metadata.name,
		// 				excludeTotalDataChart: true,
		// 				excludeTotalDataChartBreakdown: true
		// 		  })
		// 		: { fees: null, revenue: null },
		// 	getPeggedOverviewPageData(chain === 'All' ? null : metadata.name)
		// 		.then((data) => {
		// 			const { peggedAreaChartData, peggedAreaTotalData } = buildPeggedChartData({
		// 				chartDataByAssetOrChain: data?.chartDataByPeggedAsset,
		// 				assetsOrChainsList: data?.peggedAssetNames,
		// 				filteredIndexes: Object.values(data?.peggedNameToChartDataIndex || {}),
		// 				issuanceType: 'mcap',
		// 				selectedChain: chain === 'All' ? 'All' : metadata.name,
		// 				doublecountedIds: data?.doublecountedIds
		// 			})
		// 			let totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap
		// 			let totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap
		// 			const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2)

		// 			let topToken = { symbol: 'USDT', mcap: 0 }

		// 			if (peggedAreaChartData && peggedAreaChartData.length > 0) {
		// 				const recentMcaps = peggedAreaChartData[peggedAreaChartData.length - 1]

		// 				for (const token in recentMcaps) {
		// 					if (token !== 'date' && recentMcaps[token] > topToken.mcap) {
		// 						topToken = { symbol: token, mcap: recentMcaps[token] }
		// 					}
		// 				}
		// 			}

		// 			const dominance = getPeggedDominance(topToken, totalMcapCurrent)

		// 			return {
		// 				totalMcapCurrent: totalMcapCurrent ?? null,
		// 				change7d: percentChange ?? null,
		// 				topToken,
		// 				dominance: dominance ?? null
		// 			}
		// 		})
		// 		.catch((err) => {
		// 			console.log('ERROR fetching stablecoins data of chain', metadata.name, err)
		// 			return {}
		// 		}),
		// 	chain === 'All' || !metadata?.inflows
		// 		? null
		// 		: getBridgeOverviewPageData(metadata.name)
		// 				.then((data) => {
		// 					return {
		// 						netInflows: data?.chainVolumeData?.length
		// 							? data.chainVolumeData[data.chainVolumeData.length - 1]['Deposits']
		// 							: null
		// 					}
		// 				})
		// 				.catch(() => null),
		// 	chain === 'All' || !metadata?.activeUsers
		// 		? null
		// 		: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${metadata.name}`)
		// 				.then((res) => res.json())
		// 				.then((data) => data?.[data?.length - 1]?.[1] ?? null)
		// 				.catch(() => null),
		// 	chain === 'All' || !metadata?.activeUsers
		// 		? null
		// 		: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${metadata.name}`)
		// 				.then((res) => res.json())
		// 				.then((data) => data?.[data?.length - 1]?.[1] ?? null)
		// 				.catch(() => null),

		// 	chain === 'All' || !metadata?.activeUsers
		// 		? null
		// 		: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${metadata.name}`)
		// 				.then((res) => res.json())
		// 				.then((data) => data?.[data?.length - 1]?.[1] ?? null)
		// 				.catch(() => null),
		// 	fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
		// 	chain === 'All' ? null : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
		// 	metadata?.gecko_id
		// 		? fetchWithErrorLogging(
		// 				`https://pro-api.coingecko.com/api/v3/coins/${metadata?.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
		// 		  ).then((res) => res.json())
		// 		: {},
		// 	chain && chain !== 'All' && metadata?.derivatives
		// 		? getOverview('derivatives', metadata.name.toLowerCase(), undefined, false, false)
		// 		: null,
		// 	chain && chain !== 'All'
		// 		? fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
		// 		: null,
		// 	fetchWithErrorLogging(CHAINS_ASSETS)
		// 		.then((res) => res.json())
		// 		.catch(() => ({})),
		// 	chain && chain !== 'All' && metadata?.fees
		// 		? getAppRevenueByChain({ chain: metadata.name, excludeTotalDataChart: true })
		// 		: { totalAppRevenue24h: null }
		// ])

		return { chain, metadata }
	} catch (error) {
		const msg = `Error fetching ${chain} ${error instanceof Error ? error.message : 'Failed to fetch'}`
		console.log(msg)
		throw new Error(msg)
	}
}

interface IProtocolMetadata2 extends Omit<IProtocolMetadata, 'name' | 'displayName' | 'chains'> {
	name: string
	displayName: string
	chains: Array<string>
}

export const getProtocolsMetadataByChain = ({
	chainDisplayName
}: {
	chainDisplayName: string
}): Array<IProtocolMetadata2> => {
	const start = Date.now()
	if (chainDisplayName === 'All') {
		return Object.values(metadataCache.protocolMetadata).filter((protocol) =>
			protocol.name && !protocol.name.startsWith('chain#') && protocol.displayName && protocol.chains ? true : false
		) as Array<IProtocolMetadata2>
	}

	const final = Object.values(metadataCache.protocolMetadata).filter(
		(protocol) =>
			protocol.name &&
			!protocol.name.startsWith('chain#') &&
			protocol.displayName &&
			protocol.chains &&
			protocol.chains.includes(chainDisplayName)
	) as Array<IProtocolMetadata2>

	console.log('time taken: ', start, Date.now(), Date.now() - start)
	return final
}
