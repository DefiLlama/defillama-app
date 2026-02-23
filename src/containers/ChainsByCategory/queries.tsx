import { fetchChainsAssets } from '~/containers/BridgedTVL/api'
import type { RawChainsAssetsResponse } from '~/containers/BridgedTVL/api.types'
import { fetchChainsByCategory } from '~/containers/Chains/api'
import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import { getDimensionAdapterOverviewOfAllChains } from '~/containers/DimensionAdapters/queries'
import { fetchActiveAddresses } from '~/containers/OnchainUsersAndTxs/api'
import type { IActiveAddressesResponse } from '~/containers/OnchainUsersAndTxs/api.types'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { getNDistinctColors, slug } from '~/utils'
import type { IChainMetadata } from '~/utils/metadata/types'
import { fetchNftsVolumeByChain } from '../Nft/api'
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
		fetchActiveAddresses().catch(() => ({}) as IActiveAddressesResponse),
		fetchChainsAssets() as Promise<RawChainsAssetsResponse>,
		fetchNftsVolumeByChain(),
		getDimensionAdapterOverviewOfAllChains({ adapterType: 'fees', dataType: 'dailyAppRevenue', chainMetadata })
	])

	const categoryLinks = [
		{ label: 'All', to: '/chains' },
		{ label: 'Non-EVM', to: '/chains/Non-EVM' }
	].concat(
		categories.map((category) => ({
			label: category,
			to: `/chains/${category}`
		}))
	)

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
		allCategories: categoryLinks,
		colorsByChain,
		chains: chainTvls.map((chain) => {
			const name = slug(chain.name)
			const nftVolume = chainNftsVolume[name] ?? null
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
			const users = activeUsers['chain#' + name]?.users?.value
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
				: `Combined TVL, Fees, Volume, Stablecoins Supply by ${category} chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`,
		keywords:
			category === 'All'
				? 'compare chains by tvl, fees, volume, stablecoins supply, protocols'
				: `${category} chains tvl, ${category} chains fees, ${category} chains revenue, ${category} chains volume, ${category} chains total protocols`
	}
}
