import { DEFI_SETTINGS } from '~/contexts/LocalStorage'

export interface IChainMetadata {
	tvl?: boolean
	stablecoins?: boolean
	dexs?: boolean
	name: string
	activeUsers?: boolean
	fees?: boolean
	chainFees?: boolean
	derivatives?: boolean
	aggregators?: boolean
	options?: boolean
	'aggregator-derivatives'?: boolean
	'bridge-aggregators'?: boolean
	inflows?: boolean
	chainAssets?: boolean
	gecko_id?: string
	tokenSymbol?: string
	github?: boolean
}

export interface IProtocolMetadata {
	name?: string
	tvl?: boolean
	yields?: boolean
	forks?: boolean
	liquidity?: boolean
	raises?: boolean
	fees?: boolean
	revenue?: boolean
	dexs?: boolean
	perps?: boolean
	aggregator?: boolean
	options?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	displayName?: string
	chains?: Array<string>
	hacks?: boolean
	activeUsers?: boolean
	governance?: boolean
	expenses?: boolean
	treasury?: boolean
	nfts?: boolean
	emissions?: boolean
}

export interface IChainOverviewData {
	chain: string
	metadata: IChainMetadata
	protocols: Array<IProtocol>
}

export interface ILiteProtocol {
	category: string
	chains: Array<string>
	mcap: number
	name: string
	symbol: string
	logo: string
	url: string
	referralUrl: string
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	chainTvls: Record<
		typeof DEFI_SETTINGS[keyof typeof DEFI_SETTINGS],
		{
			tvl: number
			tvlPrevDay: number
			tvlPrevWeek: number
			tvlPrevMonth: number
		}
	>
	defillamaId: string
	governanceID: Array<string>
	geckoId: string
	parentProtocol?: string
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

export type TVL_TYPES = typeof DEFI_SETTINGS[keyof typeof DEFI_SETTINGS] | 'default' | 'excludeParent'

interface IChildProtocol {
	name: string
	slug: string
	category: string | null
	tvl: Record<TVL_TYPES, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> | null
	tvlChange: { change1d: number | null; change7d: number | null; change1m: number | null } | null
	tvlFormatted: string | null
	chains: Array<string>
	mcap: number | null
	mcaptvl: number | null
	strikeTvl: boolean
}

export interface IProtocol extends IChildProtocol {
	childProtocols?: Array<IChildProtocol>
}
