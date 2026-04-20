import type { RawChainAsset } from '~/containers/BridgedTVL/api.types'

interface IChainTvl {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	mcap: number | null
	mcaptvl: number | null
	name: string
	symbol: string
	protocols: number
	extraTvl: {
		borrowed?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		doublecounted?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		staking?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		excludeparent?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		liquidstaking?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		pool2?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		vesting?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
		dcAndLsOverlap?: {
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
	}
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
}

export interface IChainsByCategory {
	chainsUnique: Array<string>
	categories: Array<string>
	chainTvls: Array<IChainTvl>
	chainsGroupbyParent: Record<string, Record<string, Array<string>>>
	stackedDataset: Array<[string, Record<string, Record<string, number>>]>
	tvlTypes: Record<string, string>
}

export interface IChain extends IChainTvl {
	dexVolume24h: number | null
	dexVolume7d: number | null
	dexVolume30d: number | null
	fees24h: number | null
	fees7d: number | null
	fees30d: number | null
	revenue24h: number | null
	revenue7d: number | null
	revenue30d: number | null
	appRevenue24h: number | null
	appRevenue7d: number | null
	appRevenue30d: number | null
	stablesMcap: number | null
	activeUsers24h: number | null
	activeUsers7d: number | null
	activeUsers30d: number | null
	nftVolume24h: number | null
	nftVolume7d: number | null
	nftVolume30d: number | null
	chainAssets: RawChainAsset | null
	bridgedTvl?: number | null
	childGroups: Record<string, Array<string>> | null
}

export interface IChainsByCategoryData {
	category: string
	categoryName: string
	allCategories: Array<{
		label: string
		to: string
	}>
	colorsByChain: Record<string, string>
	chains: Array<IChain>
	totalTvlByDate: Record<string, Record<number, number>>
	tvlChartsByChain: Record<string, Record<string, Record<number, number>>>
	description: string
}

export type IFormattedDataWithExtraTvlBase = {
	chainAssets?: RawChainAsset | null
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcap: number | null
	mcaptvl: number | null
	name: string
	protocols: IChain['protocols']
	stablesMcap: IChain['stablesMcap']
	dexVolume24h: IChain['dexVolume24h']
	dexVolume7d: IChain['dexVolume7d']
	dexVolume30d: IChain['dexVolume30d']
	fees24h: IChain['fees24h']
	fees7d: IChain['fees7d']
	fees30d: IChain['fees30d']
	revenue24h: IChain['revenue24h']
	revenue7d: IChain['revenue7d']
	revenue30d: IChain['revenue30d']
	appRevenue24h: IChain['appRevenue24h']
	appRevenue7d: IChain['appRevenue7d']
	appRevenue30d: IChain['appRevenue30d']
	activeUsers24h: IChain['activeUsers24h']
	activeUsers7d: IChain['activeUsers7d']
	activeUsers30d: IChain['activeUsers30d']
	nftVolume24h: IChain['nftVolume24h']
	nftVolume7d: IChain['nftVolume7d']
	nftVolume30d: IChain['nftVolume30d']
}

export interface IFormattedDataWithExtraTvl extends IFormattedDataWithExtraTvlBase {
	subRows?: Array<IFormattedDataWithExtraTvlBase>
}
