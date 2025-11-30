import { IRaise } from '~/containers/ProtocolOverview/types'
import { IJSON } from './categories/adaptors/types'

export interface Protocol {
	id: string
	name: string
	address?: string | null
	symbol?: string | null
	assetToken?: string | null
	url: string
	description?: string | null
	chain: string
	logo: string | null
	audits?: string | null
	audit_note?: string | null
	gecko_id?: string | null
	cmcId?: string | null
	category?: string | null
	chains: Array<string>
	oracles?: Array<string>
	oraclesByChain?: Record<string, Array<string>>
	forkedFrom?: Array<string>
	module: string
	twitter?: string | null
	language?: string
	audit_links?: Array<string>
	listedAt?: number
	openSource?: boolean
	parentProtocol?: string
	referralUrl?: string
	isParentProtocol?: boolean
	raises?: Array<IRaise>
	defillamaId: string | number
	treasury?: string
	governanceID?: Array<string>
	stablecoins?: Array<string>
	deprecated?: boolean
	github?: Array<string>
}

// TODO cleanup
export interface IParentProtocol {
	id: string
	name: string
	url: string
	description: string
	logo: string
	chains: Array<string>
	gecko_id: string
	cmcId: string
	categories?: Array<string>
	twitter?: string | null
	oracles?: Array<string>
	forkedFrom?: Array<string>
	mcap: number | null
}

interface ICurrentChainTvls {
	[chain: string]: number
}

export interface IChainTvl {
	[type: string]: {
		tvl: { date: number; totalLiquidityUSD: number }[]
		tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>
		tokens?: Array<{ date: number; tokens: { [token: string]: number } }>
	}
}

export interface ITvlsWithChangesByChain {
	[key: string]: {
		tvl: number | null
		tvlPrevDay: number | null
		tvlPrevWeek: number | null
		tvlPrevMonth: number | null
	}
}

export interface ITvlsByChain {
	[chain: string]: number
}

export interface ProtocolTvls {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
	chainTvls: ITvlsWithChangesByChain
}

export interface ChainMetricSnapshot {
	chain?: string
	total24h?: number | null
	total7d?: number | null
	total30d?: number | null
	total1y?: number | null
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	revenue24h?: number | null
	revenue7d?: number | null
	revenue30d?: number | null
	revenue1y?: number | null
	feesChange_1d?: number | null
	feesChange_7d?: number | null
	feesChange_1m?: number | null
	revenueChange_1d?: number | null
	revenueChange_7d?: number | null
	revenueChange_1m?: number | null
}

export interface IProtocolResponse extends Protocol {
	otherProtocols?: Array<string>
	methodology?: string
	misrepresentedTokens?: boolean
	hallmarks?: [number, string][]
	chainTvls: IChainTvl
	currentChainTvls: ICurrentChainTvls
	tvl: { date: number; totalLiquidityUSD: number }[]
	metrics?: IJSON<boolean>
	tokenPrice?: number | null
	tokenSupply?: number | null
	tokenMcap?: number | null
	isHourlyChart?: boolean
	incentivesData?: {
		emissions24h: number
		emissions7d: number
		emissions30d: number
		emissionsAllTime: number
		incentivesChart: Array<[number, number]>
	}
}

export interface IProtocol extends Omit<IProtocolResponse, 'tvl' | 'currentChainTvls' | 'chainTvls'> {
	slug: string
	tvl: number
	chain: string
	chainTvls: ITvlsByChain
	change_1h: number | null
	change_1d: number | null
	change_7d: number | null
	mcap?: number
	fdv?: number
	staking?: number
	pool2?: number
}

export interface IChain {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	mcap: number
	name: string
	protocols: number
	mcaptvl: number
	gecko_id?: string | null
	tokenSymbol?: string | null
	cmcId?: string | null
	chainId: number | null
}

export interface IStackedDataset {
	[key: number]: {
		[key: string]: {
			[key: string]: number
		}
	}
}

export interface IChainData {
	[key: string]: [number, number][]
}

export interface IChainGeckoId {
	geckoId: string
	symbol: string
	cmcId: string
	categories: string[]
}
export type LiteProtocol = Pick<
	IProtocol,
	| 'category'
	| 'chains'
	| 'oracles'
	| 'oraclesByChain'
	| 'forkedFrom'
	| 'listedAt'
	| 'mcap'
	| 'name'
	| 'symbol'
	| 'logo'
	| 'url'
	| 'parentProtocol'
	| 'chainTvls'
	| 'referralUrl'
	| 'defillamaId'
	| 'deprecated'
> &
	ProtocolTvls

export interface IFormattedProtocol extends LiteProtocol {
	extraTvl?: {
		[key: string]: { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	}
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcaptvl: number | null
	strikeTvl?: boolean
	volume_7d?: number | null
	fees_7d?: number | null
	revenue_7d?: number | null
	fees_24h?: number | null
	revenue_24h?: number | null
	fees_30d?: number | null
	revenue_30d?: number | null
	fees_1y?: number | null
	revenue?: number | null
	revenue_1y?: number | null
	average_1y?: number | null
	average_revenue_1y?: number | null
	holdersRevenue30d?: number | null
	userFees_24h?: number | null
	cumulativeFees?: number | null
	holderRevenue_24h?: number | null
	treasuryRevenue_24h?: number | null
	supplySideRevenue_24h?: number | null
	feesChange_1d?: number | null
	feesChange_7d?: number | null
	feesChange_1m?: number | null
	feesChange_7dover7d?: number | null
	feesChange_30dover30d?: number | null
	revenueChange_1d?: number | null
	revenueChange_7d?: number | null
	revenueChange_1m?: number | null
	revenueChange_7dover7d?: number | null
	revenueChange_30dover30d?: number | null
	pf?: number | null
	ps?: number | null
	volume_24h?: number | null
	volumeChange_7d?: number | null
	volume_30d?: number | null
	volumeChange_1d?: number | null
	volumeChange_1m?: number | null
	volumeMarketShare7d?: number | null
	volumeDominance_24h?: number | null
	cumulativeVolume?: number | null
	perps_volume_24h?: number | null
	perps_volume_7d?: number | null
	perps_volume_30d?: number | null
	perps_volume_change_1d?: number | null
	perps_volume_change_7d?: number | null
	perps_volume_change_1m?: number | null
	perps_volume_dominance_24h?: number | null
	openInterest?: number | null
	holdersRevenueChange_30dover30d?: number | null
	earnings_24h?: number | null
	earnings_7d?: number | null
	earnings_30d?: number | null
	earnings_1y?: number | null
	earningsChange_1d?: number | null
	earningsChange_7d?: number | null
	earningsChange_1m?: number | null
	aggregators_volume_24h?: number | null
	aggregators_volume_7d?: number | null
	aggregators_volume_30d?: number | null
	aggregators_volume_change_1d?: number | null
	aggregators_volume_change_7d?: number | null
	aggregators_volume_dominance_24h?: number | null
	aggregators_volume_marketShare7d?: number | null
	bridge_aggregators_volume_24h?: number | null
	bridge_aggregators_volume_7d?: number | null
	bridge_aggregators_volume_30d?: number | null
	bridge_aggregators_volume_change_1d?: number | null
	bridge_aggregators_volume_change_7d?: number | null
	bridge_aggregators_volume_dominance_24h?: number | null
	options_volume_24h?: number | null
	options_volume_7d?: number | null
	options_volume_30d?: number | null
	options_volume_change_1d?: number | null
	options_volume_change_7d?: number | null
	options_volume_dominance_24h?: number | null
	volumeByChain?: Record<string, ChainMetricSnapshot>
	feesByChain?: Record<string, ChainMetricSnapshot>
	revenueByChain?: Record<string, ChainMetricSnapshot>
	perpsVolumeByChain?: Record<string, ChainMetricSnapshot>
	openInterestByChain?: Record<string, ChainMetricSnapshot>
	earningsByChain?: Record<string, ChainMetricSnapshot>
	aggregatorsVolumeByChain?: Record<string, ChainMetricSnapshot>
	bridgeAggregatorsVolumeByChain?: Record<string, ChainMetricSnapshot>
	optionsVolumeByChain?: Record<string, ChainMetricSnapshot>
}

export interface IFusedProtocolData extends Omit<IProtocolResponse, 'tvl'> {
	tvlBreakdowns: ICurrentChainTvls
	tvlByChain: [string, number][]
	historicalChainTvls: IChainTvl
}

export interface ICategory {
	label: string
	to: string
}

export type TCompressedChain = [string, { [chain: string]: { [dataType: string]: number } }]

export interface IResponseCGMarketsAPI {
	ath: number
	ath_change_percentage: number
	ath_date: string
	atl: number
	atl_change_percentage: number
	atl_date: string
	circulating_supply: number
	current_price: number
	fully_diluted_valuation: number
	high_24h: number
	id: string
	image: string
	last_updated: string
	low_24h: number
	market_cap: number
	market_cap_change_24h: number
	market_cap_change_percentage_24h: number
	market_cap_rank: number
	max_supply: number
	name: string
	price_change_24h: number
	price_change_percentage_24h: number
	roi: null
	symbol: string
	total_supply: number
	total_volume: number
	image2: string
}

export interface IProtocolDevActivity {
	project_id: string
	last_commit_update_time: string
	last_report_generated_time: string
	project_type: string
	name: string
	linked_orgs: Array<string>
	report: {
		weekly_devs: Array<{ k: string; v: number; cc: number }>
		monthly_devs: Array<{ k: string; v: number; cc: number }>
		weekly_contributers: Array<{ k: string; v: number; cc: number }>
		monthly_contributers: Array<{ k: string; v: number; cc: number }>
	}
}

export type NftVolumeData = Array<{ date: string; volume: number }>
