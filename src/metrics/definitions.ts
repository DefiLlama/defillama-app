export type FeeRevenueMetricId = 'chainFees' | 'chainRevenue' | 'appFees' | 'appRevenue' | 'rev'
export type ChainOverviewFeeRevenueMetricId = Exclude<FeeRevenueMetricId, 'rev'>
export type FeeRevenueChartLabel = 'Chain Fees' | 'Chain Revenue' | 'App Fees' | 'App Revenue'
export type FeeRevenueRankingLabel = FeeRevenueChartLabel | 'REV'
export type FeeRevenueConcept = 'chain-native' | 'app-aggregation' | 'rev'
export type FeeRevenueMetadataFlag = 'chainFees' | 'chainRevenue' | 'fees' | 'revenue'
export type FeeRevenueRankingRoute =
	| '/fees/chains'
	| '/revenue/chains'
	| '/app-fees/chains'
	| '/app-revenue/chains'
	| '/rev/chains'
export type FeeRevenueRankingBuilder = 'chain-native' | 'app-aggregation' | 'rev'
export type FeeRevenueAdapterType = 'fees'
export type ChainNativeFeeRevenueRankingDataType = 'dailyFees' | 'dailyRevenue'
export type AppAggregationFeeRevenueRankingDataType = 'dailyAppFees' | 'dailyAppRevenue'
export type FeeRevenueRankingDataType = ChainNativeFeeRevenueRankingDataType | AppAggregationFeeRevenueRankingDataType

type FeeRevenueRankingBase = {
	route: FeeRevenueRankingRoute
	name: string
	tab: 'Chains'
	totalTrackedKey: string
	descriptionIncludes: readonly string[]
}

export type FeeRevenueRankingSemantics =
	| (FeeRevenueRankingBase & {
			builder: 'chain-native'
			dataType: ChainNativeFeeRevenueRankingDataType
	  })
	| (FeeRevenueRankingBase & {
			builder: 'app-aggregation'
			dataType: AppAggregationFeeRevenueRankingDataType
	  })
	| (FeeRevenueRankingBase & {
			builder: 'rev'
			dataType?: never
	  })

export type AdapterProtocolChainChartSource = {
	kind: 'adapter-protocol'
	entity: 'chain'
	adapterType: FeeRevenueAdapterType
	dataType?: 'dailyRevenue'
}

export type AdapterChainChartSource = {
	kind: 'adapter-chain'
	adapterType: FeeRevenueAdapterType
	dataType: AppAggregationFeeRevenueRankingDataType
}

export type FeeRevenueChartSource = AdapterProtocolChainChartSource | AdapterChainChartSource

export type ChainOverviewFeeRevenueSemantics = {
	chartKey: string
	queryKey: string
	phase: string
	excludeAllChains: boolean
	source: FeeRevenueChartSource
}

export type FeeRevenueMetric = {
	id: FeeRevenueMetricId
	label: FeeRevenueRankingLabel
	concept: FeeRevenueConcept
	metadataFlag: FeeRevenueMetadataFlag
	ranking: FeeRevenueRankingSemantics
	chainOverview?: ChainOverviewFeeRevenueSemantics
}

export type ChainOverviewFeeRevenueMetric = FeeRevenueMetric & {
	id: ChainOverviewFeeRevenueMetricId
	label: FeeRevenueChartLabel
	chainOverview: ChainOverviewFeeRevenueSemantics
}

export type ChainNativeFeeRevenueMetric = ChainOverviewFeeRevenueMetric & {
	id: 'chainFees' | 'chainRevenue'
	concept: 'chain-native'
	metadataFlag: 'chainFees' | 'chainRevenue'
	chainOverview: ChainOverviewFeeRevenueSemantics & {
		source: AdapterProtocolChainChartSource
	}
}
