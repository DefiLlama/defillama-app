import { ACTIVE_USERS_API, CHAINS_ASSETS, TEMP_CHAIN_NFTS } from '~/constants'
import { IChainAssets } from '~/containers/ChainOverview/types'
import {
	getAdapterChainOverview,
	getDimensionAdapterOverviewOfAllChains,
	IAdapterOverview
} from '~/containers/DimensionAdapters/queries'
import { getPeggedAssets } from '~/containers/Stablecoins/queries.server'
import { getColorFromNumber, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IChainsByCategory, IChainsByCategoryData } from './types'

export const getChainsByCategory = async ({
	category,
	sampledChart
}: {
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
		fetchJson(`https://api.llama.fi/chains2/${category}`) as Promise<IChainsByCategory>,
		getDimensionAdapterOverviewOfAllChains({ adapterType: 'dexs', dataType: 'dailyVolume' }),
		getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>,
		getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true,
			dataType: 'dailyRevenue'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>,
		getPeggedAssets() as any,
		fetchJson(ACTIVE_USERS_API).catch(() => ({})) as Promise<
			Record<
				string,
				{
					name: string
					users: { value: string; end: number }
					txs: { value: string; end: number }
					gasUsd: { value: number; end: number }
				}
			>
		>,
		fetchJson(CHAINS_ASSETS) as Promise<IChainAssets>,
		fetchJson(TEMP_CHAIN_NFTS) as Promise<Record<string, number>>,
		getDimensionAdapterOverviewOfAllChains({ adapterType: 'fees', dataType: 'dailyAppRevenue' })
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

	const colors: Record<string, string> = {}

	rest.chainsUnique.forEach((chain, index) => {
		colors[chain] = getColorFromNumber(index, 10)
	})

	colors['Others'] = '#AAAAAA'

	const stablesChainMcaps = stablecoins.chains.map((chain) => {
		return {
			name: chain.name,
			mcap: Object.values(chain.totalCirculatingUSD).reduce((a: number, b: number) => a + b)
		}
	}) as Array<{ name: string; mcap: number }>

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

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	return {
		...rest,
		stackedDataset,
		category,
		allCategories: categoryLinks,
		colorsByChain: colors,
		chainAssets: chainsAssets ?? null,
		chains: chainTvls.map((chain) => {
			const name = slug(chain.name)
			const nftVolume = chainNftsVolume[name] ?? null
			const totalFees24h = fees?.protocols?.find((x) => x.displayName === chain.name)?.total24h ?? null
			const totalRevenue24h = revenue?.protocols?.find((x) => x.displayName === chain.name)?.total24h ?? null
			const totalAppRevenue24h = appRevenue?.[chain.name]?.['24h'] ?? null
			const totalVolume24h = dexs?.[chain.name]?.['24h'] ?? null
			const stablesMcap = stablesChainMcaps.find((x) => slug(x.name) === name)?.mcap ?? null
			const users = activeUsers['chain#' + name]?.users?.value
			const protocols = metadataCache.chainMetadata[name]?.protocolCount ?? chain.protocols ?? 0
			return {
				...chain,
				protocols,
				nftVolume: nftVolume ? +Number(nftVolume).toFixed(2) : null,
				totalVolume24h,
				totalFees24h,
				totalRevenue24h,
				stablesMcap,
				users: users ? +users : null,
				totalAppRevenue24h
			}
		})
	}
}
