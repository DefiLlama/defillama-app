import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainsAssetsResponse } from '~/containers/BridgedTVL/api.types'
import { fetchChainsByCategory } from '~/containers/Chains/api'
import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import { getDimensionAdapterOverviewOfAllChains } from '~/containers/DimensionAdapters/queries'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { getNDistinctColors, slug } from '~/utils'
import type { IChainMetadata } from '~/utils/metadata/types'
import { normalizeChainsBaseTvlValue, removeStaleChainExtraTvlEntries } from './tvl'
import type { IChainsByCategory, IChainsByCategoryData } from './types'

export const getChainsByCategory = async ({
	chainMetadata,
	category,
	sampledChart
}: {
	chainMetadata: Record<string, IChainMetadata>
	category: string
	sampledChart?: boolean
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

	let stackedDataset = rest.stackedDataset
	if (sampledChart) {
		const sampledData = []
		const dataLength = rest.stackedDataset.length
		for (let i = 0; i < dataLength; i++) {
			if (i % 2 === 0 || i === dataLength - 1) {
				sampledData.push(rest.stackedDataset[i])
			}
		}
		stackedDataset = sampledData
	}

	const tvlChartsByChain: Record<string, Record<string, Record<number, number>>> = {}
	const totalTvlByDate: Record<string, Record<number, number>> = {}
	const keysToNames = {}
	for (const key in rest.tvlTypes) {
		keysToNames[rest.tvlTypes[key]] = key
	}
	for (const [date, tvls] of stackedDataset) {
		for (const chain in tvls) {
			for (const key in tvls[chain]) {
				const keyName = keysToNames[key]
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
					tvlChartsByChain
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
