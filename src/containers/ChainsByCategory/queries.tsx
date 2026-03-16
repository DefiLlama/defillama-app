import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainsAssetsResponse } from '~/containers/BridgedTVL/api.types'
import { fetchChainsByCategory } from '~/containers/Chains/api'
import { fetchAdapterChainMetrics, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import { getDimensionAdapterOverviewOfAllChains } from '~/containers/DimensionAdapters/queries'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { getNDistinctColors, slug } from '~/utils'
import type { IChainMetadata } from '~/utils/metadata/types'
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
	const activeUserChains = Array.from(
		new Set(
			Object.values(chainMetadata)
				.filter((metadata) => metadata.chainActiveUsers)
				.map((metadata) => metadata.name)
		)
	)

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
		Promise.all(
			activeUserChains.map(async (chainName) => {
				const metrics = await fetchAdapterProtocolMetrics({
					adapterType: 'active-users',
					protocol: chainName,
					dataType: 'dailyActiveUsers'
				}).catch((err) => {
					console.log(err)
					return null
				})

				return [chainName, metrics?.total24h ?? null] as const
			})
		).then((chainMetrics) =>
			chainMetrics.reduce<Record<string, { '24h': number | null }>>((acc, [chainName, total24h]) => {
				acc[chainName] = { '24h': total24h }
				return acc
			}, {})
		),
		fetchChainsAssets() as Promise<RawChainsAssetsResponse>,
		fetchAdapterChainMetrics({
			adapterType: 'nft-volume',
			chain: 'All',
			dataType: 'dailyVolume'
		}),
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

	const stablesChainMcaps = stablecoins.chains.map((chain) => {
		let total = 0
		for (const key in chain.totalCirculatingUSD) {
			total += chain.totalCirculatingUSD[key]
		}
		return {
			name: chain.name,
			mcap: total
		}
	}) as Array<{ name: string; mcap: number }>
	const stablesChainMcapMap = new Map<string, number>()
	for (const stableChain of stablesChainMcaps) {
		const stableSlug = slug(stableChain.name)
		if (!stablesChainMcapMap.has(stableSlug)) {
			stablesChainMcapMap.set(stableSlug, stableChain.mcap)
		}
	}

	// Build lookup maps for O(1) protocol access instead of O(n) .find() calls
	const feesByDisplayName = new Map<string, (typeof fees.protocols)[0]>()
	const revenueByDisplayName = new Map<string, (typeof revenue.protocols)[0]>()
	if (fees?.protocols) {
		for (const protocol of fees.protocols) {
			if (!feesByDisplayName.has(protocol.displayName)) {
				feesByDisplayName.set(protocol.displayName, protocol)
			}
		}
	}
	if (revenue?.protocols) {
		for (const protocol of revenue.protocols) {
			if (!revenueByDisplayName.has(protocol.displayName)) {
				revenueByDisplayName.set(protocol.displayName, protocol)
			}
		}
	}
	const nftVolumeByDisplayName = new Map<string, number>()
	if (chainNftsVolume?.protocols) {
		for (const protocol of chainNftsVolume.protocols) {
			if (!nftVolumeByDisplayName.has(protocol.displayName)) {
				nftVolumeByDisplayName.set(protocol.displayName, protocol.total24h ?? 0)
			}
		}
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

				// by default doublecounted, liquidstaking tvls need to be subtracted, overlapping tvls need to be added to tvl chart
				const value =
					keyName === 'tvl'
						? tvls[chain][key] - (tvls[chain]['d'] ?? 0) - (tvls[chain]['l'] ?? 0) + (tvls[chain]['dl'] ?? 0)
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
		chains: chainTvls.map((chain) => {
			const name = slug(chain.name)
			const nftVolume = nftVolumeByDisplayName.get(chain.name) ?? null
			// O(1) Map lookups instead of O(n) .find() calls
			const feesProtocol = feesByDisplayName.get(chain.name)
			const totalFees24h = feesProtocol?.total24h ?? null
			const totalFees7d = feesProtocol?.total7d ?? null
			const totalFees30d = feesProtocol?.total30d ?? null
			const revenueProtocol = revenueByDisplayName.get(chain.name)
			const totalRevenue24h = revenueProtocol?.total24h ?? null
			const totalRevenue7d = revenueProtocol?.total7d ?? null
			const totalRevenue30d = revenueProtocol?.total30d ?? null
			const totalAppRevenue24h = appRevenue?.[chain.name]?.['24h'] ?? null
			const totalAppRevenue7d = appRevenue?.[chain.name]?.['7d'] ?? null
			const totalAppRevenue30d = appRevenue?.[chain.name]?.['30d'] ?? null
			const totalVolume24h = dexs?.[chain.name]?.['24h'] ?? null
			const totalVolume7d = dexs?.[chain.name]?.['7d'] ?? null
			const totalVolume30d = dexs?.[chain.name]?.['30d'] ?? null
			const stablesMcap = stablesChainMcapMap.get(name) ?? null
			const users = activeUsers?.[chain.name]?.['24h'] ?? null
			const protocols = chainMetadata[name]?.protocolCount ?? chain.protocols ?? 0
			const tvl =
				(chain.tvl ?? 0) -
				(chain.extraTvl?.doublecounted?.tvl ?? 0) -
				(chain.extraTvl?.liquidstaking?.tvl ?? 0) +
				(chain.extraTvl?.dcAndLsOverlap?.tvl ?? 0)
			const tvlPrevDay =
				(chain.tvlPrevDay ?? 0) -
				(chain.extraTvl?.doublecounted?.tvlPrevDay ?? 0) -
				(chain.extraTvl?.liquidstaking?.tvlPrevDay ?? 0) +
				(chain.extraTvl?.dcAndLsOverlap?.tvlPrevDay ?? 0)
			const tvlPrevWeek =
				(chain.tvlPrevWeek ?? 0) -
				(chain.extraTvl?.doublecounted?.tvlPrevWeek ?? 0) -
				(chain.extraTvl?.liquidstaking?.tvlPrevWeek ?? 0) +
				(chain.extraTvl?.dcAndLsOverlap?.tvlPrevWeek ?? 0)
			const tvlPrevMonth =
				(chain.tvlPrevMonth ?? 0) -
				(chain.extraTvl?.doublecounted?.tvlPrevMonth ?? 0) -
				(chain.extraTvl?.liquidstaking?.tvlPrevMonth ?? 0) +
				(chain.extraTvl?.dcAndLsOverlap?.tvlPrevMonth ?? 0)

			return {
				...chain,
				protocols,
				nftVolume: nftVolume ? +Number(nftVolume).toFixed(2) : null,
				totalVolume24h,
				totalVolume7d,
				totalVolume30d,
				totalFees24h,
				totalFees7d,
				totalFees30d,
				totalRevenue24h,
				totalRevenue7d,
				totalRevenue30d,
				stablesMcap,
				users: users ? +users : null,
				totalAppRevenue24h,
				totalAppRevenue7d,
				totalAppRevenue30d,
				chainAssets: chainsAssets[chain.name] ?? null,
				bridgedTvl: chainsAssets[chain.name]?.total?.total != null ? +chainsAssets[chain.name].total.total : null,
				childGroups: rest.chainsGroupbyParent[chain.name] ?? null,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth
			}
		}),
		description:
			category === 'All'
				? 'Combined TVL, Fees, Volume, Stablecoins Supply by all chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.'
				: `Combined TVL, Fees, Volume, Stablecoins Supply by ${category} chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`
	}
}
