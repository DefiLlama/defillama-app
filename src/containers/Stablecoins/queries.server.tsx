import {
	CONFIG_API,
	PEGGED_API,
	PEGGEDCHART_API,
	PEGGEDCHART_COINS_RECENT_DATA_API,
	PEGGEDCHART_DOMINANCE_ALL_API,
	PEGGEDCONFIG_API,
	PEGGEDPRICES_API,
	PEGGEDRATES_API,
	PEGGEDS_API
} from '~/constants'
import {
	formatPeggedAssetsData,
	formatPeggedChainsData,
	getPrevStablecoinTotalFromChart
} from '~/containers/Stablecoins/utils'
import { getPercentChange, slug } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'

const STABLECOINS_CACHE_TTL = 60 * 60 * 24
const STABLECOINS_CACHE_PREFIX = 'stablecoins'

async function withStablecoinsCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const cacheKey = `${STABLECOINS_CACHE_PREFIX}:${key}`

	try {
		const data = await fetcher()
		await setObjectCache(cacheKey, data, STABLECOINS_CACHE_TTL)
		return data
	} catch (error) {
		const cached = await getObjectCache(cacheKey)
		if (cached !== null) {
			postRuntimeLogs(`[stablecoins] [cache] [fallback] < ${cacheKey} >`)
			return cached as T
		}

		throw error
	}
}

export const getPeggedAssets = () =>
	withStablecoinsCache('pegged-assets', () =>
		fetchJson(PEGGEDS_API).then(({ peggedAssets, chains }) => ({
			protocolsDict: peggedAssets.reduce((acc, curr) => {
				acc[slug(curr.name)] = curr
				return acc
			}, {}),
			peggedAssets,
			chains
		}))
	)

export const getPeggedPrices = () => withStablecoinsCache('pegged-prices', () => fetchJson(PEGGEDPRICES_API))
export const getPeggedRates = () => withStablecoinsCache('pegged-rates', () => fetchJson(PEGGEDRATES_API))
export const getConfigData = () => withStablecoinsCache('config', () => fetchJson(CONFIG_API))
export const getPeggedConfigData = () => withStablecoinsCache('pegged-config', () => fetchJson(PEGGEDCONFIG_API))

export const getPeggedBridgeInfo = () =>
	withStablecoinsCache('bridge-info', () =>
		fetchJson('https://llama-stablecoins-data.s3.eu-central-1.amazonaws.com/bridgeInfo.json')
	)

let globalData: any

function fetchGlobalData({ peggedAssets, chains }: any) {
	if (globalData) return globalData
	const tvlMap: any = {}
	for (const chain of chains) {
		tvlMap[chain.name] = chain.tvl
	}
	const chainList = chains
		.sort((a, b) => {
			const bTotalCirculatings = Object.values(b.totalCirculatingUSD) as any
			const bMcap = bTotalCirculatings.reduce((c, d) => c + d)
			const aTotalCirculatings = Object.values(a.totalCirculatingUSD) as any
			const aMcap = aTotalCirculatings.reduce((c, d) => c + d)
			return bMcap - aMcap
		})
		.map((chain) => chain.name)
	const chainsSet = new Set()
	const _chainSet = new Set(chainList)
	for (const { chains } of peggedAssets) {
		for (const chain of chains) {
			if (!chain) {
				chainsSet.add(chain)
			} else {
				if (_chainSet.has(chain)) chainsSet.add(chain)
			}
		}
	}
	globalData = {
		chainList,
		chainsSet,
		_chains: chainList.filter((chain) => chainsSet.has(chain)),
		chainsTVLData: chainList.map((chain) => tvlMap[chain])
	}

	return globalData
}

export async function getPeggedOverviewPageData(chain) {
	const chainKey = chain ? slug(chain) : 'all'
	return withStablecoinsCache(`overview:${chainKey}`, async () => {
		const { peggedAssets, chains } = await getPeggedAssets()
		const chainLabel = chain ?? 'all-llama-app' // custom key to fetch limited data to reduce page size
		const chainData = await fetchJson(`${PEGGEDCHART_API}/${chainLabel}`)
		const breakdown = chainData?.breakdown
		if (!breakdown) {
			throw new Error(`[getPeggedOverviewPageData] [${chainLabel}] no breakdown`)
		}

		const priceData = await getPeggedPrices()
		const rateData = await getPeggedRates()

		let chartDataByPeggedAsset = []
		let peggedAssetNamesSet: Set<string> = new Set() // fix name of this variable

		let peggedNameToChartDataIndex: object = {}
		let lastTimestamp = 0
		const doublecountedIds = []
		chartDataByPeggedAsset = peggedAssets.map((elem, i) => {
			if (peggedAssetNamesSet.has(elem.symbol)) peggedAssetNamesSet.add(`${elem.name}`)
			else peggedAssetNamesSet.add(elem.symbol)

			peggedNameToChartDataIndex[elem.name] = i
			let charts = breakdown[elem.id] ?? []
			const formattedCharts = charts
				.map((chart) => {
					return {
						date: chart.date,
						mcap: chart.totalCirculatingUSD
					}
				})
				.filter((i) => i.mcap !== undefined)
			if (formattedCharts.length > 0) {
				lastTimestamp = Math.max(lastTimestamp, formattedCharts[formattedCharts.length - 1].date)
			}

			if (chainData?.doublecountedIds?.includes(elem.id)) {
				doublecountedIds.push(i)
			}
			return formattedCharts
		})
		for (const chart of chartDataByPeggedAsset) {
			const last = chart[chart.length - 1]
			if (!last) {
				continue
			}
			let lastDate = Number(last.date)
			while (lastDate < lastTimestamp) {
				lastDate += 24 * 3600
				chart.push({
					...last,
					date: lastDate
				})
			}
		}

		const filteredPeggedAssets = formatPeggedAssetsData({
			peggedAssets,
			chartDataByPeggedAsset,
			priceData,
			rateData,
			peggedNameToChartDataIndex,
			chain
		})

		return {
			chains: fetchGlobalData({ peggedAssets, chains })._chains,
			filteredPeggedAssets: filteredPeggedAssets || [],
			peggedAssetNames: [...peggedAssetNamesSet],
			peggedNameToChartDataIndex,
			chartDataByPeggedAsset,
			doublecountedIds,
			chain: chain ?? 'All'
		}
	})
}

export async function getPeggedChainsPageData() {
	return withStablecoinsCache('chains-page', async () => {
		const { peggedAssets, chains } = await getPeggedAssets()
		const { chainCoingeckoIds } = await getConfigData()

		const { aggregated: chartData } = await fetchJson(`${PEGGEDCHART_API}/all`)
		const { dominanceMap, chainChartMap } = await fetchJson(PEGGEDCHART_DOMINANCE_ALL_API)
		const { chainList, chainsTVLData } = fetchGlobalData({ peggedAssets, chains })

		let chainsGroupbyParent: Record<string, Record<string, string[]>> = {}
		for (const chain of chainList) {
			const parent = chainCoingeckoIds[chain]?.parent
			if (parent) {
				if (!chainsGroupbyParent[parent.chain]) {
					chainsGroupbyParent[parent.chain] = {}
				}
				for (const type of parent.types) {
					if (!chainsGroupbyParent[parent.chain][type]) {
						chainsGroupbyParent[parent.chain][type] = []
					}
					chainsGroupbyParent[parent.chain][type].push(chain)
				}
			}
		}

		let peggedChartDataByChain = chainList.map((chain) => chainChartMap[chain] ?? null)

		let peggedDomDataByChain = chainList.map((chain) => dominanceMap[chain])

		let chainDominances = {}
		peggedDomDataByChain.map((charts, i) => {
			if (!charts) return
			const lastChart = charts[charts.length - 1]
			if (!lastChart) return
			const greatestChainMcap = lastChart.greatestMcap
			const chainName = chainList[i]
			chainDominances[chainName] = greatestChainMcap
		})

		const chainCirculatings = formatPeggedChainsData({
			chainList,
			peggedChartDataByChain,
			chainDominances,
			chainsTVLData
		})

		peggedChartDataByChain = peggedChartDataByChain.map((charts) => {
			if (!charts) return null
			const formattedCharts = charts.map((chart) => {
				return {
					date: chart.date,
					mcap: chart.totalCirculatingUSD ?? null
				}
			})
			return formattedCharts
		})

		return {
			chainCirculatings,
			chartData,
			peggedChartDataByChain,
			chainList,
			chainsGroupbyParent
		}
	})
}

export const getPeggedAssetPageData = async (peggedasset: string) => {
	const peggedNameToPeggedIDMapping = await getPeggedConfigData()
	const peggedID = peggedNameToPeggedIDMapping[peggedasset]
	if (!peggedID) {
		return null
	}
	return withStablecoinsCache(`asset:${peggedID}`, async () => {
		const [res, { chainCoingeckoIds }, recentCoinsData] = await Promise.all([
			fetchJson(`${PEGGED_API}/${peggedID}`).catch((e) => {
				console.log(`Failed to fetch ${PEGGED_API}/${peggedID}: ${e}`)
				return null
			}),
			getConfigData(),
			fetchJson(PEGGEDCHART_COINS_RECENT_DATA_API)
		])

		const peggedChart = recentCoinsData[peggedID]
		const bridgeInfo = await getPeggedBridgeInfo()

		const pegType = res.pegType

		const totalCirculating = getPrevStablecoinTotalFromChart(peggedChart, 0, 'totalCirculating', pegType)
		const unreleased = getPrevStablecoinTotalFromChart(peggedChart, 0, 'totalUnreleased', pegType)
		const mcap = getPrevStablecoinTotalFromChart(peggedChart, 0, 'totalCirculatingUSD', pegType)

		const chainsUnique: string[] = Object.keys(res.chainBalances)

		const chainsData: any[] = await Promise.all(
			chainsUnique.map(async (elem: string) => {
				return res.chainBalances[elem].tokens
			})
		)

		const chainCirculatings = chainsUnique
			.map((chainName, i) => {
				const circulating: number = getPrevStablecoinTotalFromChart(chainsData[i], 0, 'circulating', pegType)
				const unreleased: number = getPrevStablecoinTotalFromChart(chainsData[i], 0, 'unreleased', pegType)
				let bridgedTo: number = getPrevStablecoinTotalFromChart(chainsData[i], 0, 'bridgedTo', pegType)
				const bridges: any = getPrevStablecoinTotalFromChart(chainsData[i], 0, 'bridgedTo', 'bridges')
				const circulatingPrevDay: number = getPrevStablecoinTotalFromChart(chainsData[i], 1, 'circulating', pegType)
				const circulatingPrevWeek: number = getPrevStablecoinTotalFromChart(chainsData[i], 7, 'circulating', pegType)
				const circulatingPrevMonth: number = getPrevStablecoinTotalFromChart(chainsData[i], 30, 'circulating', pegType)
				const change_1d = getPercentChange(circulating, circulatingPrevDay)
				const change_7d = getPercentChange(circulating, circulatingPrevWeek)
				const change_1m = getPercentChange(circulating, circulatingPrevMonth)

				return {
					circulating,
					unreleased,
					change_1d,
					change_7d,
					change_1m,
					circulatingPrevDay,
					circulatingPrevWeek,
					circulatingPrevMonth,
					bridgedAmount: bridgedTo,
					bridges,
					name: chainName,
					symbol: chainCoingeckoIds[chainName]?.symbol ?? '-'
				}
			})
			.sort((a, b) => b.circulating - a.circulating)

		return {
			props: {
				chainsUnique,
				chainCirculatings,
				peggedAssetData: res,
				totalCirculating,
				unreleased,
				mcap,
				bridgeInfo
			}
		}
	})
}
