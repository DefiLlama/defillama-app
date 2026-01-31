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
	normalizedVolume?: boolean
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
	activeUsers?: boolean
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

export interface IRWAList {
	tickers: Array<string>
	platforms: Array<string>
	chains: Array<string>
	categories: Array<string>
	idMap: Record<string, string>
}
