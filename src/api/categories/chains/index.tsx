import { CHART_API, PROTOCOLS_API } from '~/constants'
import { formatProtocolsData } from '../protocols/utils'
import { formatProtocolsList } from '~/hooks/data/defi'
import { fetchWithErrorLogging } from '~/utils/async'
import { getDexVolumeByChain } from '../dexs'
import { getCexVolume } from '../adaptors/utils'
import { getFeesAndRevenueByChain } from '../fees'

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
	const [chartData, { protocols, chains, parentProtocols }, volume, cexVolume, { fees, revenue }] = await Promise.all([
		fetch(CHART_API + (chain ? '/' + chain : '')).then((r) => r.json()),
		fetch(PROTOCOLS_API).then((res) => res.json()),
		getDexVolumeByChain({ chain, excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true }),
		getCexVolume(),
		getFeesAndRevenueByChain({ chain, excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true })
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
			...charts
		}
	}
}

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)
