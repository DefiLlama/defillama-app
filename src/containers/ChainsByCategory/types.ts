import { IChainAsset } from '~/containers/ChainOverview/types'

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

interface IChain extends IChainTvl {
	nftVolume: number | null
	totalVolume24h: number | null
	totalFees24h: number | null
	totalRevenue24h: number | null
	stablesMcap: number | null
	users: number | null
	totalAppRevenue24h: number | null
	chainAssets: IChainAsset | null
	childGroups: Record<string, Array<string>> | null
}

export interface IChainsByCategoryData {
	category: string
	allCategories: Array<{
		label: string
		to: string
	}>
	colorsByChain: Record<string, string>
	chains: Array<IChain>
	totalTvlByDate: Record<string, Record<number, number>>
	tvlChartsByChain: Record<string, Record<string, Record<number, number>>>
	description: string
	keywords: string
}
