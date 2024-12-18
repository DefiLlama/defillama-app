import groupBy from 'lodash/groupBy'
import mapValues from 'lodash/mapValues'
import sumBy from 'lodash/sumBy'

import {
	CHAINS_API,
	CHAINS_ASSETS,
	CHAINS_ASSETS_CHART,
	CHART_API,
	DEV_METRICS_API,
	PROTOCOLS_API,
	PROTOCOLS_TREASURY,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	RAISES_API
} from '~/constants'
import { formatProtocolsData } from '../protocols/utils'
import { formatProtocolsList } from '~/hooks/data/defi'
import { fetchWithErrorLogging } from '~/utils/async'
import { fetchOverCache } from '~/utils/perf'
import { maxAgeForNext } from '~/api'
import { getCexVolume } from '../adaptors/utils'
import { getPeggedDominance, getPercentChange, slug } from '~/utils'
import { buildPeggedChartData } from '~/utils/stablecoins'
import { getPeggedOverviewPageData } from '../stablecoins'
import { getBridgeOverviewPageData } from '../bridges'
import chainsMetadata from 'metadata/chains.json'
import { getOverview } from '../adaptors'
import { getFeesAndRevenueByChain } from '../fees'
import { getDexVolumeByChain } from '../dexs'

const getExtraTvlCharts = (data) => {
	const {
		tvl = [],
		staking = [],
		borrowed = [],
		pool2 = [],
		vesting = [],
		offers = [],
		doublecounted = [],
		liquidstaking = [],
		dcAndLsOverlap = []
	} = data || {}

	const chart = tvl.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])

	const extraTvlCharts = {
		staking: staking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		borrowed: borrowed.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		pool2: pool2.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		vesting: vesting.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		offers: offers.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		doublecounted: doublecounted.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		liquidstaking: liquidstaking.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)]),
		dcAndLsOverlap: dcAndLsOverlap.map(([date, totalLiquidityUSD]) => [date, Math.trunc(totalLiquidityUSD)])
	}

	return {
		chart,
		extraTvlCharts
	}
}

// - used in / and /[chain]
export async function getChainPageData(chain?: string) {
	const chainMetadata = chain && chain !== 'All' ? chainsMetadata[slug(chain)] : null

	if (chain && chain !== 'All' && !chainMetadata) {
		return { notFound: true, props: null }
	}

	const [
		chartData,
		{ protocols, chains, parentProtocols },
		volume,
		cexVolume,
		{ fees, revenue },
		stablecoinsData,
		inflowsData,
		activeUsers,
		transactions,
		newUsers,
		raisesData,
		devMetricsData,
		treasuriesData,
		cgData,
		perpsData,
		nftVolumesData,
		chainAssets
	] = await Promise.all([
		fetchWithErrorLogging(CHART_API + (chainMetadata ? `/${chainMetadata.name}` : '')).then((r) => r.json()),
		fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		getDexVolumeByChain({
			chain: chainMetadata?.name,
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		getCexVolume(),
		getFeesAndRevenueByChain({
			chain: chainMetadata?.name,
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		getPeggedOverviewPageData(!chain || chain === 'All' ? null : chainMetadata?.name)
			.then((data) => {
				const { peggedAreaChartData, peggedAreaTotalData } = buildPeggedChartData(
					data?.chartDataByPeggedAsset,
					data?.peggedAssetNames,
					Object.values(data?.peggedNameToChartDataIndex || {}),
					'mcap',
					!chain || chain === 'All' ? 'All' : chainMetadata?.name
				)
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

				const dominance = getPeggedDominance(topToken, totalMcapCurrent)

				return {
					totalMcapCurrent: totalMcapCurrent ?? null,
					change7d: percentChange ?? null,
					topToken,
					dominance: dominance ?? null
				}
			})
			.catch((err) => {
				console.log('ERROR fetching stablecoins data of chain', chainMetadata?.name, err)
				return {}
			}),
		!chain || chain === 'All' || !chainMetadata?.inflows
			? null
			: getBridgeOverviewPageData(chainMetadata?.name)
					.then((data) => {
						return {
							netInflows: data?.chainVolumeData?.length
								? data.chainVolumeData[data.chainVolumeData.length - 1]['Deposits']
								: null
						}
					})
					.catch(() => null),
		!chain || chain === 'All' || !chainMetadata?.activeUsers
			? null
			: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${chainMetadata?.name}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		!chain || chain === 'All' || !chainMetadata?.activeUsers
			? null
			: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${chainMetadata?.name}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),

		!chain || chain === 'All' || !chainMetadata?.activeUsers
			? null
			: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${chainMetadata?.name}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
		!chain || chain === 'All'
			? null
			: fetch(`${DEV_METRICS_API}/chain/${chainMetadata?.name?.toLowerCase()}.json`)
					.then((r) => r.json())
					.catch(() => null),
		!chain || chain === 'All' ? null : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
		chainMetadata?.gecko_id
			? fetchOverCache(
					`https://pro-api.coingecko.com/api/v3/coins/${chainMetadata?.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
			  ).then((res) => res.json())
			: {},
		chain && chain !== 'All'
			? getOverview('derivatives', chainMetadata?.name?.toLowerCase(), undefined, false, false)
			: null,
		chain && chain !== 'All'
			? fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json())
			: null,
		fetchWithErrorLogging(CHAINS_ASSETS)
			.then((res) => res.json())
			.catch(() => ({}))
	])

	const chainTreasury = treasuriesData?.find(
		(t) =>
			t?.name?.toLowerCase().startsWith(`${chainMetadata?.name?.toLowerCase()}`) &&
			['Services', 'Chain'].includes(t?.category)
	)
	const chainRaises = raisesData?.raises?.filter(
		(r) => r?.defillamaId === `chain#${chainMetadata?.name?.toLowerCase()}`
	)

	const filteredProtocols = formatProtocolsData({
		chain: chainMetadata?.name,
		protocols,
		removeBridges: true
	})

	const charts = getExtraTvlCharts(chartData)

	const protocolsList = formatProtocolsList({
		protocols: filteredProtocols,
		parentProtocols,
		extraTvlsEnabled: {}
	})
		.slice(0, 30)
		.map((protocol: any) => {
			for (const prop in protocol) {
				if (protocol[prop] === undefined) {
					protocol[prop] = null
				}

				if (prop === 'subRows') {
					protocol[prop]?.map((subRow) => {
						for (const subProp in subRow) {
							if (subRow[subProp] === undefined) {
								subRow[subProp] = null
							}
						}

						return subRow
					})
				}
			}

			return protocol
		})

	const raisesChart =
		(!chain || chain === 'All') && raisesData && raisesData?.raises
			? mapValues(
					groupBy(raisesData.raises, (val) => val.date),
					(raises) => sumBy(raises, 'amount')
			  )
			: null

	return {
		props: {
			...(chainMetadata?.name && { chain: chainMetadata.name }),
			chainTokenInfo: chainMetadata
				? {
						gecko_id: chainMetadata.gecko_id ?? null,
						tokenSymbol: chainMetadata.tokenSymbol ?? null,
						...(cgData || {})
				  }
				: null,
			chainTreasury: chainTreasury ?? null,
			chainRaises: chainRaises ?? null,
			chainAssets: chainMetadata?.name ? chainAssets[chainMetadata.name] ?? null : null,
			chainsSet: chains,
			chainOptions: ['All'].concat(chains).map((label) => ({ label, to: setSelectedChain(label) })),
			protocolsList,
			volumeData: {
				totalVolume24h: volume?.total24h ?? null,
				totalVolume7d: volume?.total7d ?? null,
				weeklyChange: volume?.change_7dover7d ?? null,
				dexsDominance:
					cexVolume && volume?.total24h ? +((volume.total24h / (cexVolume + volume.total24h)) * 100).toFixed(2) : null
			},
			perpsData: {
				totalVolume24h: perpsData?.total24h ?? null,
				totalVolume7d: perpsData?.total7d ?? null,
				weeklyChange: perpsData?.change_7dover7d ?? null
			},
			feesAndRevenueData: { totalFees24h: fees?.total24h ?? null, totalRevenue24h: revenue?.total24h ?? null },
			stablecoinsData,
			devMetricsData,
			inflowsData,
			userData: { activeUsers, newUsers, transactions },
			raisesChart,
			noContext: false,
			nftVolumesData:
				nftVolumesData && chainMetadata?.name ? nftVolumesData[chainMetadata.name.toLowerCase()] ?? null : null,
			...charts
		},
		revalidate: maxAgeForNext([22])
	}
}

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)
