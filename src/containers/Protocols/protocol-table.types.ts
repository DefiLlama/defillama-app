interface ITvlsWithChangesByChain {
	[key: string]: {
		tvl: number | null
		tvlPrevDay: number | null
		tvlPrevWeek: number | null
		tvlPrevMonth: number | null
	}
}

interface ProtocolTvls {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
	chainTvls: ITvlsWithChangesByChain
}

interface LiteProtocol {
	category?: string | null
	chains: Array<string>
	oracles?: Array<string>
	oraclesByChain?: Record<string, Array<string>>
	forkedFrom?: Array<string>
	listedAt?: number
	mcap?: number | null
	name: string
	symbol?: string | null
	logo: string | null
	url: string
	parentProtocol?: string
	referralUrl?: string
	defillamaId: string | number
	deprecated?: boolean
}

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

export interface IFormattedProtocol extends LiteProtocol, ProtocolTvls {
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
