import { getColorFromNumber, slug } from '~/utils'
import { ACTIVE_USERS_API, CHAINS_ASSETS } from '~/constants'
import { getPeggedAssets } from '~/Stablecoins/queries.server'
import { fetchWithErrorLogging } from '~/utils/async'
import { getAdapterOverview, IAdapterOverview } from '~/DimensionAdapters/queries'
import { IChainAssets } from '~/ChainOverview/types'
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
		fetchWithErrorLogging(`https://api.llama.fi/chains2/${category}`).then((res) =>
			res.json()
		) as Promise<IChainsByCategory>,
		getAdapterOverview({
			type: 'dexs',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>,
		getAdapterOverview({
			type: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>,
		getAdapterOverview({
			type: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true,
			dataType: 'dailyRevenue'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>,
		getPeggedAssets() as any,
		fetchWithErrorLogging(ACTIVE_USERS_API)
			.then((res) => res.json())
			.catch(() => ({})) as Promise<
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
		fetchWithErrorLogging(CHAINS_ASSETS).then((res) => res.json()) as Promise<IChainAssets>,
		fetchWithErrorLogging(`https://defillama-datasets.llama.fi/temp/chainNfts`).then((res) => res.json()) as Promise<
			Record<string, number>
		>,
		getAdapterOverview({
			type: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true,
			dataType: 'dailyAppRevenue'
		}).catch((err) => {
			console.log(err)
			return null
		}) as Promise<IAdapterOverview | null>
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
			const totalAppRevenue24h = appRevenue?.protocols?.find((x) => x.displayName === chain.name)?.total24h ?? null
			const totalVolume24h = dexs?.protocols?.find((x) => x.displayName === chain.name)?.total24h ?? null
			const stablesMcap = stablesChainMcaps.find((x) => x.name.toLowerCase() === name)?.mcap ?? null
			const users = activeUsers['chain#' + name]?.users?.value

			return {
				...chain,
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
