import {
	ACTIVE_USERS_API,
	CHART_API,
	PROTOCOLS_API,
	PROTOCOL_ACTIVE_USERS_API,
	PROTOCOL_NEW_USERS_API,
	PROTOCOL_TRANSACTIONS_API,
	RAISES_API
} from '~/constants'
import { formatProtocolsData } from '../protocols/utils'
import { formatProtocolsList } from '~/hooks/data/defi'
import { fetchWithErrorLogging } from '~/utils/async'
import { getDexVolumeByChain } from '../dexs'
import { getCexVolume } from '../adaptors/utils'
import { getFeesAndRevenueByChain } from '../fees'
import { getPeggedDominance, getPercentChange } from '~/utils'
import { buildPeggedChartData } from '~/utils/stablecoins'
import { getPeggedOverviewPageData } from '../stablecoins'
import { getBridgeOverviewPageData } from '../bridges'
import { maxAgeForNext } from '~/api'
import groupBy from 'lodash/groupBy'
import mapValues from 'lodash/mapValues'
import sumBy from 'lodash/sumBy'

const fetch = fetchWithErrorLogging

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
	const totalTrackedUserData = await fetch(`${ACTIVE_USERS_API}`)
		.then((res) => res.json())
		.catch(() => null)

	const hasUserData = chain ? !!totalTrackedUserData?.[`chain#${chain?.toLowerCase()}`] : false
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
		raisesData
	] = await Promise.all([
		fetch(CHART_API + (chain ? '/' + chain : '')).then((r) => r.json()),
		fetch(PROTOCOLS_API).then((res) => res.json()),
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
					data?.chainTVLData,
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
		!chain || chain === 'All'
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
			: fetch(`${PROTOCOL_ACTIVE_USERS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		!chain || chain === 'All' || !hasUserData
			? null
			: fetch(`${PROTOCOL_TRANSACTIONS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),

		!chain || chain === 'All' || !hasUserData
			? null
			: fetch(`${PROTOCOL_NEW_USERS_API}/chain$${chain}`)
					.then((res) => res.json())
					.then((data) => data?.[data?.length - 1]?.[1] ?? null)
					.catch(() => null),
		!chain || chain === 'All' ? fetch(RAISES_API).then((r) => r.json()) : null
	])

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
		.map((protocol) => {
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
		raisesData && raisesData?.raises
			? mapValues(
					groupBy(raisesData.raises, (val) => val.date),
					(raises) => sumBy(raises, 'amount')
			  )
			: null

	return {
		props: {
			...(chain && { chain }),
			chainsSet: chains,
			chainOptions: ['All'].concat(chains).map((label) => ({ label, to: setSelectedChain(label) })),
			protocolsList,
			volumeData: {
				totalVolume24h: volume.total24h ?? null,
				totalVolume7d: volume.total7d ?? null,
				weeklyChange: volume.change_7dover7d ?? null,
				dexsDominance:
					cexVolume && volume.total24h ? +((volume.total24h / (cexVolume + volume.total24h)) * 100).toFixed(2) : null
			},
			feesAndRevenueData: { totalFees24h: fees?.total24h ?? null, totalRevenue24h: revenue?.total24h ?? null },
			stablecoinsData,
			inflowsData,
			userData: { activeUsers, newUsers, transactions },
			raisesChart,
			...charts
		},
		revalidate: maxAgeForNext([22])
	}
}

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)
