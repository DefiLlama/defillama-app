import type { IChainMetadata } from '~/utils/metadata/types'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../AdapterMetrics/constants'

type ChainOverviewFeeRevenueMetricId = 'chainFees' | 'chainRevenue' | 'appFees' | 'appRevenue'
type ChainOverviewFeeRevenueChartLabel = 'Chain Fees' | 'Chain Revenue' | 'App Fees' | 'App Revenue'
type ChainOverviewFeeRevenueMetadataFlag = 'chainFees' | 'chainRevenue' | 'fees' | 'revenue'

type AdapterProtocolChartSource = {
	kind: 'adapter-protocol'
	entity: 'chain'
	adapterType: ADAPTER_TYPES.FEES
	dataType?: ADAPTER_DATA_TYPES.DAILY_REVENUE
}

type AdapterChainChartSource = {
	kind: 'adapter-chain'
	adapterType: ADAPTER_TYPES.FEES
	dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES | ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
}

type ChainOverviewFeeRevenueMetric = {
	id: ChainOverviewFeeRevenueMetricId
	label: ChainOverviewFeeRevenueChartLabel
	chartKey: string
	queryKey: string
	metadataFlag: ChainOverviewFeeRevenueMetadataFlag
	phase: string
	excludeAllChains: boolean
	source: AdapterProtocolChartSource | AdapterChainChartSource
}

// ChainOverview has two different fee/revenue concepts. These descriptors keep
// metric intent in one place while preserving the existing adapter/API shapes.
export const chainOverviewFeeRevenueMetrics = {
	chainFees: {
		id: 'chainFees',
		label: 'Chain Fees',
		chartKey: 'chainFees',
		queryKey: 'chain-fees',
		metadataFlag: 'chainFees',
		phase: 'chain_fees',
		excludeAllChains: false,
		source: {
			kind: 'adapter-protocol',
			entity: 'chain',
			adapterType: ADAPTER_TYPES.FEES
		}
	},
	chainRevenue: {
		id: 'chainRevenue',
		label: 'Chain Revenue',
		chartKey: 'chainRevenue',
		queryKey: 'chain-revenue',
		metadataFlag: 'chainRevenue',
		phase: 'chain_revenue',
		excludeAllChains: false,
		source: {
			kind: 'adapter-protocol',
			entity: 'chain',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
		}
	},
	appFees: {
		id: 'appFees',
		label: 'App Fees',
		chartKey: 'appFees',
		queryKey: 'app-fees',
		metadataFlag: 'fees',
		phase: 'app_fees',
		excludeAllChains: true,
		source: {
			kind: 'adapter-chain',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
		}
	},
	appRevenue: {
		id: 'appRevenue',
		label: 'App Revenue',
		chartKey: 'appRevenue',
		queryKey: 'app-revenue',
		metadataFlag: 'revenue',
		phase: 'app_revenue',
		excludeAllChains: true,
		source: {
			kind: 'adapter-chain',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
		}
	}
} as const satisfies Record<ChainOverviewFeeRevenueMetricId, ChainOverviewFeeRevenueMetric>

export function shouldFetchChainOverviewFeeRevenueMetric({
	metric,
	metadata,
	chain
}: {
	metric: ChainOverviewFeeRevenueMetric
	metadata: IChainMetadata
	chain: string
}): boolean {
	if (metric.excludeAllChains && chain === 'All') return false
	return !!metadata[metric.metadataFlag]
}

export function getChainOverviewFeeRevenueChartApiParams({
	metric,
	chain
}: {
	metric: ChainOverviewFeeRevenueMetric
	chain: string
}): Record<string, string | undefined> {
	if (metric.source.kind === 'adapter-protocol') {
		return {
			kind: metric.source.kind,
			entity: metric.source.entity,
			adapterType: metric.source.adapterType,
			protocol: chain,
			dataType: metric.source.dataType
		}
	}

	return {
		kind: metric.source.kind,
		adapterType: metric.source.adapterType,
		chain,
		dataType: metric.source.dataType
	}
}
