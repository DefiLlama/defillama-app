import type { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'

export type FeeRevenueMetricId = 'chainFees' | 'chainRevenue' | 'appFees' | 'appRevenue'
export type FeeRevenueChartLabel = 'Chain Fees' | 'Chain Revenue' | 'App Fees' | 'App Revenue'
export type FeeRevenueMetadataFlag = 'chainFees' | 'chainRevenue' | 'fees' | 'revenue'

export type AdapterProtocolChainChartSource = {
	kind: 'adapter-protocol'
	entity: 'chain'
	adapterType: ADAPTER_TYPES.FEES
	dataType?: ADAPTER_DATA_TYPES.DAILY_REVENUE
}

export type AdapterChainChartSource = {
	kind: 'adapter-chain'
	adapterType: ADAPTER_TYPES.FEES
	dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES | ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
}

export type FeeRevenueChartSource = AdapterProtocolChainChartSource | AdapterChainChartSource

export type FeeRevenueMetric = {
	id: FeeRevenueMetricId
	label: FeeRevenueChartLabel
	chartKey: string
	queryKey: string
	metadataFlag: FeeRevenueMetadataFlag
	phase: string
	excludeAllChains: boolean
	source: FeeRevenueChartSource
}

export type ChainNativeFeeRevenueMetric = FeeRevenueMetric & {
	id: 'chainFees' | 'chainRevenue'
	metadataFlag: 'chainFees' | 'chainRevenue'
	source: AdapterProtocolChainChartSource
}
