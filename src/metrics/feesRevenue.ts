import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import type { IChainMetadata } from '~/utils/metadata/types'
import type { FeeRevenueMetric, FeeRevenueMetricId } from './definitions'

// Fees/revenue terminology has two chain concepts: chain-native economics and
// app-on-chain aggregation. These descriptors keep that intent separate from
// route names and adapter endpoint shapes.
export const feeRevenueMetrics = {
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
} as const satisfies Record<FeeRevenueMetricId, FeeRevenueMetric>

export function shouldFetchChainOverviewFeeRevenueMetric({
	metric,
	metadata,
	chain
}: {
	metric: FeeRevenueMetric
	metadata: IChainMetadata
	chain: string
}): boolean {
	if (metric.excludeAllChains && chain === 'All') return false
	return !!metadata[metric.metadataFlag]
}
