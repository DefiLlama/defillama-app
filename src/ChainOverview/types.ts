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
	tvlChart: Array<[string, number]>
	extraTvlChart: {
		staking: Array<[string, number]>
		borrowed: Array<[string, number]>
		pool2: Array<[string, number]>
		vesting: Array<[string, number]>
		offers: Array<[string, number]>
		doublecounted: Array<[string, number]>
		liquidstaking: Array<[string, number]>
		dcAndLsOverlap: Array<[string, number]>
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
	}
	chainRevenue: { total24h: number | null }
	appRevenue: { total24h: number | null }
	dexs: {
		total24h: number | null
		total7d: number | null
		change_7dover7d: number | null
		dexsDominance: number | null
		chart: Array<[number, number]> | null
	}
	perps: { total24h: number | null; total7d: number | null; change_7dover7d: number | null }
	users: { activeUsers: number | null; newUsers: number | null; transactions: number | null }
	totalFundingAmount: number | null
	inflows: { netInflows: number | null } | null
	raises: Record<string, number> | null
	treasury: { tvl: number | null; tokenBreakdowns: Record<string, number> | null } | null
	chainRaises: Array<IRaises> | null
	chainAssets: IChainAsset | null
	devMetrics: null
	nfts: { total24h: number | null }
	etfs: Array<[number, number]> | null
	globalmcap: {
		chart: Array<[number, number]> | null
		change7d: string | null
	} | null
	defimcap: {
		chart: Array<[number, number]> | null
		change7d: string | null
	} | null
	allChains: Array<{ label: string; to: string }>
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
	oracles?: Array<string>
	oraclesByChain?: Record<string, Array<string>>
	forkedFrom?: string
	listedAt: number
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
		average1y: number | null
		totalAllTime: number | null
		pf: number | null
	}
	revenue?: {
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		average1y: number | null
		totalAllTime: number | null
		ps: number | null
	}
	dexs?: {
		total24h: number | null
		total7d: number | null
		totalAllTime: number | null
		change_7dover7d: number | null
	}
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

interface IChainAsset {
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

export interface IChainAssets {
	[chain: string]: IChainAsset
}
