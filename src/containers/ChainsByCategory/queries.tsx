import { fetchAdapterChainMetrics } from '~/containers/AdapterMetrics/api'
import type { IAdapterChainMetrics } from '~/containers/AdapterMetrics/api.types'
import { getDimensionAdapterOverviewOfAllChains } from '~/containers/AdapterMetrics/queries'
import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainsAssetsResponse } from '~/containers/BridgedTVL/api.types'
import { fetchChainsByCategory } from '~/containers/Chains/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getNDistinctColors, slug } from '~/utils'
import type { IChainMetadata } from '~/utils/metadata/types'
import { normalizeChainsBaseTvlValue, removeStaleChainExtraTvlEntries } from './tvl'
import type { IChainsByCategory, IChainsByCategoryData } from './types'

type IChainsByCategoryChartData = Pick<IChainsByCategoryData, 'tvlChartsByChain' | 'totalTvlByDate'>

function buildChainsByCategoryChartData({
	stackedDataset,
	tvlTypes,
	sampledChart,
	extraTvlTypes = []
}: {
	stackedDataset: IChainsByCategory['stackedDataset']
	tvlTypes: IChainsByCategory['tvlTypes']
	sampledChart?: boolean
	extraTvlTypes?: readonly string[]
}): IChainsByCategoryChartData {
	let chartDataset = stackedDataset
	if (sampledChart) {
		const sampledData = []
		const dataLength = stackedDataset.length
		for (let i = 0; i < dataLength; i++) {
			if (i % 2 === 0 || i === dataLength - 1) {
				sampledData.push(stackedDataset[i])
			}
		}
		chartDataset = sampledData
	}

	const tvlChartsByChain: Record<string, Record<string, Record<number, number>>> = {}
	const totalTvlByDate: Record<string, Record<number, number>> = {}
	const keysToNames: Record<string, string> = {}
	for (const key in tvlTypes) {
		keysToNames[tvlTypes[key]] = key
	}
	const includedTvlTypes = new Set(['tvl'])
	for (const key of extraTvlTypes) {
		if (key in tvlTypes) {
			includedTvlTypes.add(key)
		}
	}
	if (includedTvlTypes.has('doublecounted') && includedTvlTypes.has('liquidstaking') && 'dcAndLsOverlap' in tvlTypes) {
		includedTvlTypes.add('dcAndLsOverlap')
	}

	for (const [date, tvls] of chartDataset) {
		for (const chain in tvls) {
			for (const key in tvls[chain]) {
				const keyName = keysToNames[key]
				if (!keyName || !includedTvlTypes.has(keyName)) continue
				totalTvlByDate[keyName] = totalTvlByDate[keyName] || {}

				// Match /chain/:chain base TVL: subtract current doublecounted and liquid staking, then add overlap back.
				const value =
					keyName === 'tvl'
						? normalizeChainsBaseTvlValue(tvls[chain][key], {
								doublecounted: tvls[chain]['d'],
								liquidstaking: tvls[chain]['l'],
								dcAndLsOverlap: tvls[chain]['dl']
							})
						: tvls[chain][key]
				tvlChartsByChain[keyName] = tvlChartsByChain[keyName] || {}
				tvlChartsByChain[keyName][chain] = tvlChartsByChain[keyName][chain] || {}
				tvlChartsByChain[keyName][chain][+date * 1e3] = value
				totalTvlByDate[keyName][+date * 1e3] = (totalTvlByDate[keyName][+date * 1e3] ?? 0) + value
			}
		}
	}

	return { tvlChartsByChain, totalTvlByDate }
}

function buildChainsLatestTvlTimestamps({
	stackedDataset,
	tvlTypes
}: {
	stackedDataset: IChainsByCategory['stackedDataset']
	tvlTypes: IChainsByCategory['tvlTypes']
}): IChainsByCategoryChartData['tvlChartsByChain'] {
	const keysToNames: Record<string, string> = {}
	for (const key in tvlTypes) {
		keysToNames[tvlTypes[key]] = key
	}

	const latestTimestamps: Record<string, Record<string, number>> = {}
	for (const [date, tvls] of stackedDataset) {
		const timestamp = +date * 1e3
		for (const chain in tvls) {
			for (const key in tvls[chain]) {
				const keyName = keysToNames[key]
				if (!keyName) continue

				latestTimestamps[keyName] = latestTimestamps[keyName] || {}
				if (latestTimestamps[keyName][chain] == null || timestamp > latestTimestamps[keyName][chain]) {
					latestTimestamps[keyName][chain] = timestamp
				}
			}
		}
	}

	const tvlChartsByChain: IChainsByCategoryChartData['tvlChartsByChain'] = {}
	for (const key in latestTimestamps) {
		tvlChartsByChain[key] = {}
		for (const chain in latestTimestamps[key]) {
			tvlChartsByChain[key][chain] = { [latestTimestamps[key][chain]]: 1 }
		}
	}

	return tvlChartsByChain
}

export async function getChainsByCategoryChartData({
	category,
	sampledChart,
	extraTvlTypes
}: {
	category: string
	sampledChart?: boolean
	extraTvlTypes?: readonly string[]
}): Promise<IChainsByCategoryChartData> {
	const { stackedDataset, tvlTypes } = await fetchChainsByCategory<IChainsByCategory>(category)
	return buildChainsByCategoryChartData({ stackedDataset, tvlTypes, sampledChart, extraTvlTypes })
}

export const getChainsByCategory = async ({
	chainMetadata,
	category,
	sampledChart,
	includeChartData = true
}: {
	chainMetadata: Record<string, IChainMetadata>
	category: string
	sampledChart?: boolean
	includeChartData?: boolean
}): Promise<IChainsByCategoryData> => {
	const [
		{ categories, chainTvls, ...rest },
		dexs,
		fees,
		revenue,
		stablecoins,
		activeUsers,
		chainsAssets,
		chainNftsVolume,
		appRevenue
	] = await Promise.all([
		fetchChainsByCategory<IChainsByCategory>(category),
		getDimensionAdapterOverviewOfAllChains({ adapterType: 'dexs', dataType: 'dailyVolume', chainMetadata }),
		fetchAdapterChainMetrics({
			adapterType: 'fees',
			chain: 'All'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterChainMetrics | null>,
		fetchAdapterChainMetrics({
			adapterType: 'fees',
			chain: 'All',
			dataType: 'dailyRevenue'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterChainMetrics | null>,
		fetchStablecoinAssetsApi(),
		fetchAdapterChainMetrics({
			adapterType: 'active-users',
			chain: 'All',
			dataType: 'dailyActiveUsers'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterChainMetrics | null>,
		fetchChainsAssets() as Promise<RawChainsAssetsResponse>,
		fetchAdapterChainMetrics({
			adapterType: 'nft-volume',
			chain: 'All',
			dataType: 'dailyVolume'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterChainMetrics | null>,
		getDimensionAdapterOverviewOfAllChains({ adapterType: 'fees', dataType: 'dailyAppRevenue', chainMetadata })
	])

	const categoryLinks = [
		{ label: 'All', to: '/chains' },
		{ label: 'Non-EVM', to: '/chains/non-evm' }
	].concat(
		categories.map((cat) => ({
			label: cat,
			to: `/chains/${slug(cat)}`
		}))
	)

	// Find categoryName by matching slugified category against categories
	let categoryName: string
	if (category === 'all') {
		categoryName = 'All'
	} else if (category === 'non-evm') {
		categoryName = 'Non-EVM'
	} else {
		categoryName = categories.find((cat) => slug(cat) === category) || category
	}

	const allColors = getNDistinctColors(rest.chainsUnique.length)
	const colorsByChain: Record<string, string> = {}

	for (let i = 0; i < rest.chainsUnique.length; i++) {
		colorsByChain[rest.chainsUnique[i]] = allColors[i]
	}

	colorsByChain['Others'] = '#AAAAAA'

	const stablesChainMcapMap = new Map<string, number>()
	for (const chain of stablecoins.chains) {
		const key = slug(chain.name)
		if (stablesChainMcapMap.has(key)) continue
		let total = 0
		for (const k in chain.totalCirculatingUSD) {
			total += chain.totalCirculatingUSD[k]
		}
		stablesChainMcapMap.set(key, total)
	}

	const feesByDisplayName: Record<string, (typeof fees.protocols)[0]> = {}
	for (const protocol of fees?.protocols ?? []) {
		feesByDisplayName[protocol.displayName] ??= protocol
	}

	const revenueByDisplayName: Record<string, (typeof revenue.protocols)[0]> = {}
	for (const protocol of revenue?.protocols ?? []) {
		revenueByDisplayName[protocol.displayName] ??= protocol
	}

	const nftVolumeByDisplayName: Record<string, (typeof chainNftsVolume.protocols)[0]> = {}
	for (const protocol of chainNftsVolume?.protocols ?? []) {
		nftVolumeByDisplayName[protocol.displayName] ??= protocol
	}

	const activeUsersByDisplayName: Record<string, (typeof activeUsers.protocols)[0]> = {}
	for (const protocol of activeUsers?.protocols ?? []) {
		if (!protocol.defillamaId.startsWith('chain#')) continue
		activeUsersByDisplayName[protocol.displayName] ??= protocol
	}

	const { tvlChartsByChain, totalTvlByDate } = includeChartData
		? buildChainsByCategoryChartData({
				stackedDataset: rest.stackedDataset,
				tvlTypes: rest.tvlTypes,
				sampledChart,
				extraTvlTypes: TVL_SETTINGS_KEYS
			})
		: ({ tvlChartsByChain: {}, totalTvlByDate: {} } satisfies IChainsByCategoryChartData)
	const staleExtraTvlCleanupCharts = includeChartData
		? tvlChartsByChain
		: buildChainsLatestTvlTimestamps({
				stackedDataset: rest.stackedDataset,
				tvlTypes: rest.tvlTypes
			})

	return {
		tvlChartsByChain,
		totalTvlByDate,
		category,
		categoryName,
		allCategories: categoryLinks,
		colorsByChain,
		chains: chainTvls
			.map((chain) => {
				const name = slug(chain.name)
				const extraTvl = removeStaleChainExtraTvlEntries({
					chainName: chain.name,
					extraTvl: chain.extraTvl,
					tvlChartsByChain: staleExtraTvlCleanupCharts
				})

				const fees24h = feesByDisplayName[chain.name]?.total24h ?? null
				const fees7d = feesByDisplayName[chain.name]?.total7d ?? null
				const fees30d = feesByDisplayName[chain.name]?.total30d ?? null

				const revenue24h = revenueByDisplayName[chain.name]?.total24h ?? null
				const revenue7d = revenueByDisplayName[chain.name]?.total7d ?? null
				const revenue30d = revenueByDisplayName[chain.name]?.total30d ?? null

				const appRevenue24h = appRevenue?.[chain.name]?.['24h'] ?? null
				const appRevenue7d = appRevenue?.[chain.name]?.['7d'] ?? null
				const appRevenue30d = appRevenue?.[chain.name]?.['30d'] ?? null

				const dexVolume24h = dexs?.[chain.name]?.['24h'] ?? null
				const dexVolume7d = dexs?.[chain.name]?.['7d'] ?? null
				const dexVolume30d = dexs?.[chain.name]?.['30d'] ?? null

				const stablesMcap = stablesChainMcapMap.get(name) ?? null

				const activeUsers24h = activeUsersByDisplayName[chain.name]?.total24h ?? null
				const activeUsers7d = activeUsersByDisplayName[chain.name]?.total7d ?? null
				const activeUsers30d = activeUsersByDisplayName[chain.name]?.total30d ?? null

				const protocols = chainMetadata[name]?.protocolCount ?? chain.protocols ?? 0

				const tvl = normalizeChainsBaseTvlValue(chain.tvl, {
					doublecounted: extraTvl?.doublecounted?.tvl,
					liquidstaking: extraTvl?.liquidstaking?.tvl,
					dcAndLsOverlap: extraTvl?.dcAndLsOverlap?.tvl
				})
				const tvlPrevDay = normalizeChainsBaseTvlValue(chain.tvlPrevDay, {
					doublecounted: extraTvl?.doublecounted?.tvlPrevDay,
					liquidstaking: extraTvl?.liquidstaking?.tvlPrevDay,
					dcAndLsOverlap: extraTvl?.dcAndLsOverlap?.tvlPrevDay
				})
				const tvlPrevWeek = normalizeChainsBaseTvlValue(chain.tvlPrevWeek, {
					doublecounted: extraTvl?.doublecounted?.tvlPrevWeek,
					liquidstaking: extraTvl?.liquidstaking?.tvlPrevWeek,
					dcAndLsOverlap: extraTvl?.dcAndLsOverlap?.tvlPrevWeek
				})
				const tvlPrevMonth = normalizeChainsBaseTvlValue(chain.tvlPrevMonth, {
					doublecounted: extraTvl?.doublecounted?.tvlPrevMonth,
					liquidstaking: extraTvl?.liquidstaking?.tvlPrevMonth,
					dcAndLsOverlap: extraTvl?.dcAndLsOverlap?.tvlPrevMonth
				})

				const nftVolume24h = nftVolumeByDisplayName[chain.name]?.total24h ?? null
				const nftVolume7d = nftVolumeByDisplayName[chain.name]?.total7d ?? null
				const nftVolume30d = nftVolumeByDisplayName[chain.name]?.total30d ?? null

				return {
					...chain,
					extraTvl,
					protocols,
					stablesMcap,
					dexVolume24h,
					dexVolume7d,
					dexVolume30d,
					fees24h,
					fees7d,
					fees30d,
					revenue24h,
					revenue7d,
					revenue30d,
					appRevenue24h,
					appRevenue7d,
					appRevenue30d,
					activeUsers24h,
					activeUsers7d,
					activeUsers30d,
					chainAssets: chainsAssets[chain.name] ?? null,
					bridgedTvl: chainsAssets[chain.name]?.total?.total != null ? +chainsAssets[chain.name].total.total : null,
					childGroups: rest.chainsGroupbyParent[chain.name] ?? null,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					nftVolume24h,
					nftVolume7d,
					nftVolume30d
				}
			})
			.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0)),
		description:
			category === 'All'
				? 'Combined TVL, Fees, Volume, Stablecoins Supply by all chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.'
				: `Combined TVL, Fees, Volume, Stablecoins Supply by ${category} chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`
	}
}
