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
import { getDexVolumeByChain } from '../dexs'
import { getCexVolume } from '../adaptors/utils'
import { getFeesAndRevenueByChain } from '../fees'
import { getPeggedDominance, getPercentChange } from '~/utils'
import { buildPeggedChartData } from '~/utils/stablecoins'
import { getPeggedOverviewPageData } from '../stablecoins'
import { getBridgeOverviewPageData } from '../bridges'
import chainsMetadata from 'metadata/chains.json'

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
	const [chainAssets, chainsConfig] = await Promise.all([
		fetchWithErrorLogging(CHAINS_ASSETS)
			.then((res) => res.json())
			.catch(() => ({})),
		fetchWithErrorLogging(CHAINS_API)
			.then((res) => res.json())
			.catch(() => [])
	])

	const currentChain = chainsConfig.find((c) => c.name.toLowerCase() === chain?.toLowerCase())
	const hasUserData = chain ? chainsMetadata[chain]?.activeUsers : false

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
		chainAssetsChart
	] = await Promise.all([
		fetchWithErrorLogging(CHART_API + (chain ? '/' + chain : '')).then((r) => r.json()),
		fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json()),
		getDexVolumeByChain({ chain, excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true }),
		getCexVolume(),
		getFeesAndRevenueByChain({ chain, excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true }),
		getPeggedOverviewPageData(!chain || chain === 'All' ? null : chain)
			.then((data) => {
				const { peggedAreaChartData, peggedAreaTotalData } = buildPeggedChartData(
					data?.chartDataByPeggedAsset,
					data?.peggedAssetNames,
					Object.values(data?.peggedNameToChartDataIndex || {}),
					'mcap',
					!chain || chain === 'All' ? 'All' : chain
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
				console.log('ERROR fetching stablecoins data of chain', chain, err)
				return {}
			}),
		!chain || chain === 'All' || !chainsMetadata[chain]?.inflows
			? null
			: getBridgeOverviewPageData(chain)
					.then((data) => {
						return {
							netInflows: data?.chainVolumeData?.length
								? data.chainVolumeData[data.chainVolumeData.length - 1]['Deposits']
								: null
						}
					})
					.catch(() => null),
		!chain || chain === 'All' || !hasUserData
			? null
			: fetchWithErrorLogging(`${PROTOCOL_ACTIVE_USERS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		!chain || chain === 'All' || !hasUserData
			? null
			: fetchWithErrorLogging(`${PROTOCOL_TRANSACTIONS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),

		!chain || chain === 'All' || !hasUserData
			? null
			: fetchWithErrorLogging(`${PROTOCOL_NEW_USERS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		fetchWithErrorLogging(RAISES_API).then((r) => r.json()),
		!chain || chain === 'All'
			? null
			: fetch(`${DEV_METRICS_API}/chain/${chain?.toLowerCase()}.json`)
					.then((r) => r.json())
					.catch(() => null),
		!chain || chain === 'All' ? null : fetchWithErrorLogging(PROTOCOLS_TREASURY).then((r) => r.json()),
		currentChain?.gecko_id
			? fetchOverCache(
					`https://pro-api.coingecko.com/api/v3/coins/${currentChain?.gecko_id}?tickers=true&community_data=false&developer_data=false&sparkline=false&x_cg_pro_api_key=${process.env.CG_KEY}`
			  ).then((res) => res.json())
			: {},
		chain && chain !== 'All' && chainsMetadata[chain]?.chainAssets
			? await fetchWithErrorLogging(`${CHAINS_ASSETS_CHART}/${chain}`)
					.then((r) => r.json())
					.catch(() => null)
			: null
	])

	const chainTreasury = treasuriesData?.find(
		(t) => t?.name?.toLowerCase().startsWith(`${chain?.toLowerCase()}`) && ['Services', 'Chain'].includes(t?.category)
	)
	const chainRaises = raisesData?.raises?.filter((r) => r?.defillamaId === `chain#${chain?.toLowerCase()}`)

	const filteredProtocols = formatProtocolsData({
		chain,
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
			...(chain && { chain }),
			chainTokenInfo: currentChain ? { ...currentChain, ...(cgData || {}) } : null,
			chainTreasury: chainTreasury ?? null,
			chainAssetsChart: chainAssetsChart ?? null,
			chainRaises: chainRaises ?? null,
			chainAssets: chainAssets[chain?.toLowerCase()] ?? null,
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
			feesAndRevenueData: { totalFees24h: fees?.total24h ?? null, totalRevenue24h: revenue?.total24h ?? null },
			stablecoinsData,
			devMetricsData,
			inflowsData,
			userData: { activeUsers, newUsers, transactions },
			raisesChart,
			noContext: false,
			...charts
		},
		revalidate: maxAgeForNext([22])
	}
}

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)
