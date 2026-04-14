export interface IChainMetadata {
	stablecoins?: boolean
	dexs?: boolean
	dexsNotionalVolume?: boolean
	name: string
	activeLiquidity?: boolean
	fees?: boolean
	revenue?: boolean
	chainFees?: boolean
	chainRevenue?: boolean
	perps?: boolean
	openInterest?: boolean
	normalizedVolume?: boolean
	dexAggregators?: boolean
	optionsPremiumVolume?: boolean
	optionsNotionalVolume?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	inflows?: boolean
	chainAssets?: boolean
	gecko_id?: string
	tokenSymbol?: string | null
	github?: boolean
	id: string
	protocolCount?: number
	incentives?: boolean
	chainActiveUsers?: boolean
	chainNewUsers?: boolean
	activeUsers?: boolean
	newUsers?: boolean
	txCount?: boolean
	gasUsed?: boolean
	dimAgg?: Record<string, Record<string, { '24h'?: number | null; '7d'?: number | null; '30d'?: number | null }>>
}

export interface IProtocolMetadata {
	tvl?: boolean
	yields?: boolean
	forks?: boolean
	liquidity?: boolean
	raises?: boolean
	fees?: boolean
	revenue?: boolean
	holdersRevenue?: boolean
	dexs?: boolean
	dexsNotionalVolume?: boolean
	perps?: boolean
	openInterest?: boolean
	normalizedVolume?: boolean
	dexAggregators?: boolean
	optionsPremiumVolume?: boolean
	optionsNotionalVolume?: boolean
	perpsAggregators?: boolean
	bridgeAggregators?: boolean
	displayName?: string
	chains?: Array<string>
	hacks?: boolean
	governance?: boolean
	expenses?: boolean
	treasury?: boolean
	nfts?: boolean
	emissions?: boolean
	incentives?: boolean
	bribeRevenue?: boolean
	tokenTax?: boolean
	bridge?: boolean
	stablecoins?: boolean
	safeHarbor?: boolean
	borrowed?: boolean
	tokenRights?: boolean
	inflows?: boolean
	activeUsers?: boolean
	newUsers?: boolean
	txCount?: boolean
	gasUsed?: boolean
	gecko_id?: string
}

export interface ICexItem {
	name: string
	slug?: string
	coin?: string | null
	coinSymbol?: string | null
	walletsLink?: string | null
	cgId?: string | null
	cgDeriv?: string | null
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string | null
}

export interface ICategoriesAndTagsConfig {
	category: string
	chains: Array<string>
	slug: string
	dimAgg?: Record<string, unknown>
	bridgeAggregators?: boolean
	dexAggregators?: boolean
	dexs?: boolean
	fees?: boolean
	normalizedVolume?: boolean
	openInterest?: boolean
	optionsNotionalVolume?: boolean
	optionsPremiumVolume?: boolean
	perps?: boolean
	perpsAggregators?: boolean
	revenue?: boolean
}

export interface ICategoriesAndTags {
	categories: Array<string>
	tags: Array<string>
	tagCategoryMap: Record<string, string>
	configs: Record<string, ICategoriesAndTagsConfig>
}

export interface IRWAList {
	tickers: Array<string>
	platforms: Array<string>
	chains: Array<string>
	categories: Array<string>
	assetGroups: Array<string>
	idMap: Record<string, string>
}

export interface IRWAPerpsList {
	contracts: Array<string>
	venues: Array<string>
	categories: Array<string>
	assetGroups: Array<string>
	total: number
}

export interface ITokenListEntry {
	symbol: string
	current_price: number | null
	price_change_24h: number | null
	price_change_percentage_24h: number | null
	ath: number | null
	ath_date: string | null
	atl: number | null
	atl_date: string | null
	market_cap: number | null
	fully_diluted_valuation: number | null
	total_volume: number | null
	total_supply: number | null
	circulating_supply: number | null
	max_supply: number | null
}

export interface IProtocolLlamaswapChain {
	chain: string
	address: string
	displayName: string
	best?: boolean
}

export type ProtocolLlamaswapMetadata = Record<string, IProtocolLlamaswapChain[] | null>
