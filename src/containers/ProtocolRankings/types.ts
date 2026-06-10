import { TVL_SETTINGS } from '~/contexts/LocalStorage'
import type { IProtocolLlamaswapChain as BuyOnLlamaswapChain } from '~/utils/metadata/types'

export interface ILiteProtocol {
	category: string
	tags?: Array<string>
	chains: Array<string>
	mcap: number | null
	name: string
	symbol: string
	logo: string
	url: string
	referralUrl?: string
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	chainTvls: Record<
		(typeof TVL_SETTINGS)[keyof typeof TVL_SETTINGS],
		{
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
	>
	defillamaId: string
	governanceID?: Array<string>
	geckoId?: string
	parentProtocol?: string
	oracles?: Array<string>
	oraclesByChain?: Record<string, Array<string>>
	forkedFrom?: Array<string>
	listedAt?: number
	deprecated?: boolean
}

export interface ILiteParentProtocol {
	id: string
	name: string
	url: string
	description: string
	logo: string
	chains: Array<string>
	gecko_id: string
	cmcId: string
	treasury: string
	twitter: string
	governanceID: Array<string>
	wrongLiquidity: boolean
	github: Array<string>
	mcap: number
}

export type TVL_TYPES = (typeof TVL_SETTINGS)[keyof typeof TVL_SETTINGS] | 'default' | 'excludeParent'

export interface IChildProtocol {
	name: string
	slug: string
	category: string | null
	tvl: Record<TVL_TYPES, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> | null
	tvlChange: { change1d: number | null; change7d: number | null; change1m: number | null } | null
	chains: Array<string>
	mcap: number | null
	tokenPrice: number | null
	llamaswapChains?: BuyOnLlamaswapChain[] | null
	mcaptvl: number | null
	strikeTvl: boolean
	fees?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		monthlyAverage1y: number | null
		totalAllTime: number | null
		pf: number | null
	}
	revenue?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		monthlyAverage1y: number | null
		totalAllTime: number | null
		ps: number | null
	}
	holdersRevenue?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		monthlyAverage1y: number | null
		totalAllTime: number | null
	}
	dexs?: {
		total24h: number | null
		total7d: number | null
		totalAllTime: number | null
		change_7dover7d: number | null
	}
	emissions?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		monthlyAverage1y: number | null
		totalAllTime: number | null
	}
	deprecated?: boolean
}

export interface IProtocol extends IChildProtocol {
	childProtocols?: Array<IChildProtocol>
}
