import { DEFI_SETTINGS } from '~/contexts/LocalStorage'
import { ChainChartLabels } from './constants'

export interface IChainMetadata {
	stablecoins?: boolean
	dexs?: boolean
	name: string
	activeUsers?: boolean
	fees?: boolean
	revenue?: boolean
	chainFees?: boolean
	chainRevenue?: boolean
	perps?: boolean
	openInterest?: boolean
	dexAggregators?: boolean
	optionsPremiumVolume?: boolean
	optionsNotionalVolume?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	inflows?: boolean
	chainAssets?: boolean
	gecko_id?: string
	tokenSymbol?: string
	github?: boolean
	id: string
	protocolCount?: number
	incentives?: boolean
	dimAgg?: Record<string, Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }>>
}

export interface IChainOverviewData {
	chain: string
	metadata: IChainMetadata
	protocols: Array<IProtocol>
	tvlChart: Array<[number, number]>
	extraTvlCharts: {
		staking: Record<string, number>
		borrowed: Record<string, number>
		pool2: Record<string, number>
		vesting: Record<string, number>
		offers: Record<string, number>
		doublecounted: Record<string, number>
		liquidstaking: Record<string, number>
		dcAndLsOverlap: Record<string, number>
	}
	chainTokenInfo: {
		gecko_id: string | null
		token_symbol: string | null
		current_price: string | null
		market_cap: string | null
		fully_diluted_valuation: string | null
	} | null
	stablecoins: {
		mcap: number | null
		change7dUsd: number | null
		change7d: string | null
		topToken: { symbol: string; mcap: number }
		dominance: string | null
		mcapChartData: Array<[number, number]> | null
	} | null
	chainFees: {
		total24h: number | null
		feesGenerated24h: number | null
		topProtocolsChart: Array<[string, number, string]> | null
		totalREV24h: number | null
	}
	chainRevenue: { total24h: number | null }
	chainIncentives: {
		emissions24h: number | null
		emissions7d: number | null
		emissions30d: number | null
	}
	appRevenue: { total24h: number | null }
	appFees: { total24h: number | null }
	dexs: {
		total24h: number | null
		total7d: number | null
		change_7dover7d: number | null
		dexsDominance: number | null
		chart: Array<[number, number]> | null
	}
	perps: { total24h: number | null; total7d: number | null; change_7dover7d: number | null }
	users: { activeUsers: number | null; newUsers: number | null; transactions: number | null }
	inflows: { netInflows: number | null } | null
	treasury: { tvl: number | null; tokenBreakdowns: Record<string, number> | null } | null
	chainRaises: Array<IRaises> | null
	chainAssets: IFormattedChainAsset | null
	devMetrics: null
	nfts: { total24h: number | null }
	etfs: Array<[number, number]> | null
	globalmcap: {
		chart: Array<[number, number]> | null
		change7d: string | null
	} | null
	rwaTvlChartData: Array<[number, { tvl: number; borrowed?: number; staking?: number; doublecounted?: number }]> | null
	allChains: Array<{ label: string; to: string }>
	unlocks: {
		chart: Array<[number, Record<string, number>]>
		total14d: number
		tokens: Array<[string, string]>
	} | null
	tvlAndFeesOptions: Array<{ name: string; key: string }>
	charts: ChainChartLabels[]
	description: string
	keywords: string
	isDataAvailable: boolean
}

export interface ILiteChart {
	tvl: Array<[string, number]>
	staking: Array<[string, number]>
	borrowed: Array<[string, number]>
	pool2: Array<[string, number]>
	vesting: Array<[string, number]>
	offers: Array<[string, number]>
	doublecounted: Array<[string, number]>
	liquidstaking: Array<[string, number]>
	dcAndLsOverlap: Array<[string, number]>
}

export interface ILiteProtocol {
	category: string
	tags?: Array<string>
	chains: Array<string>
	mcap: number
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
		(typeof DEFI_SETTINGS)[keyof typeof DEFI_SETTINGS],
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
	forkedFrom?: string
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

export type TVL_TYPES = (typeof DEFI_SETTINGS)[keyof typeof DEFI_SETTINGS] | 'default' | 'excludeParent'

export interface IChildProtocol {
	name: string
	slug: string
	category: string | null
	tvl: Record<TVL_TYPES, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }> | null
	tvlChange: { change1d: number | null; change7d: number | null; change1m: number | null } | null
	chains: Array<string>
	mcap: number | null
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

export interface IRaises {
	date: number
	name: string
	round: string
	amount: number
	chains: Array<string>
	sector: string
	category: string
	categoryGroup: string
	source: string
	leadInvestors: []
	otherInvestors: Array<string>
	valuation: string | null
	defillamaId?: string
}

export interface ITreasury {
	id: string
	name: string
	address: string | null
	symbol: string
	url: string
	description: string
	chain: string
	logo: string
	audits: string
	audit_note: string | null
	gecko_id: string | number | null
	cmcId: string | number | null
	category: string
	chains: Array<string>
	module: string
	treasury: string
	twitter: string
	oracles: Array<string>
	forkedFrom: Array<string>
	slug: string
	tvl: number | null
	chainTvls: {
		Ethereum: number | null
	}
	change_1h: number | null
	change_1d: number | null
	change_7d: number | null
	tokenBreakdowns: {
		ownTokens: number | null
		stablecoins: number | null
		majors: number | null
		others: number | null
	}
	mcap: number | null
}

export interface IChainAsset {
	canonical: {
		total: string
		breakdown: Record<string, string>
	}
	ownTokens?: {
		total: string
		breakdown: Record<string, string>
	}
	native?: {
		total: string
		breakdown: Record<string, string>
	}
	thirdParty?: {
		total: string
		breakdown: Record<string, string>
	}
	total: {
		total: string
		breakdown: Record<string, string>
	}
}

export interface IFormattedChainAsset {
	canonical: {
		total: number
		breakdown: Record<string, number>
	}
	ownTokens?: {
		total: number
		breakdown: Record<string, number>
	}
	native?: {
		total: number
		breakdown: Record<string, number>
	}
	thirdParty?: {
		total: number
		breakdown: Record<string, number>
	}
	total: {
		total: number
		breakdown: Record<string, number>
	}
}

export interface IChainAssets {
	[chain: string]: IChainAsset
}
