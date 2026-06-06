import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import type { IChainMetadata } from '~/utils/metadata/types'
import type { ChainOverviewFeeRevenueMetric, FeeRevenueMetric, FeeRevenueMetricId } from './definitions'

// Fees/revenue terminology has two chain concepts: chain-native economics and
// app-on-chain aggregation. These descriptors keep that intent separate from
// route names and adapter endpoint shapes.
export const feeRevenueMetrics = {
	chainFees: {
		id: 'chainFees',
		label: 'Chain Fees',
		concept: 'chain-native',
		metadataFlag: 'chainFees',
		ranking: {
			route: '/fees/chains',
			name: 'Fees by Chain',
			tab: 'Chains',
			totalTrackedKey: 'chainFees.chains',
			descriptionIncludes: ['using the chain'],
			builder: 'chain-native',
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES
		},
		chainOverview: {
			chartKey: 'chainFees',
			queryKey: 'chain-fees',
			phase: 'chain_fees',
			excludeAllChains: false,
			source: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: ADAPTER_TYPES.FEES
			}
		}
	},
	chainRevenue: {
		id: 'chainRevenue',
		label: 'Chain Revenue',
		concept: 'chain-native',
		metadataFlag: 'chainRevenue',
		ranking: {
			route: '/revenue/chains',
			name: 'Revenue by Chain',
			tab: 'Chains',
			totalTrackedKey: 'chainRevenue.chains',
			descriptionIncludes: ['chain collects for itself'],
			builder: 'chain-native',
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
		},
		chainOverview: {
			chartKey: 'chainRevenue',
			queryKey: 'chain-revenue',
			phase: 'chain_revenue',
			excludeAllChains: false,
			source: {
				kind: 'adapter-protocol',
				entity: 'chain',
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
			}
		}
	},
	appFees: {
		id: 'appFees',
		label: 'App Fees',
		concept: 'app-aggregation',
		metadataFlag: 'fees',
		ranking: {
			route: '/app-fees/chains',
			name: 'App Fees by Chain',
			tab: 'Chains',
			totalTrackedKey: 'fees.chains',
			descriptionIncludes: ['apps on the chain', 'Excludes', 'gas fees'],
			builder: 'app-aggregation',
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
		},
		chainOverview: {
			chartKey: 'appFees',
			queryKey: 'app-fees',
			phase: 'app_fees',
			excludeAllChains: true,
			source: {
				kind: 'adapter-chain',
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
			}
		}
	},
	appRevenue: {
		id: 'appRevenue',
		label: 'App Revenue',
		concept: 'app-aggregation',
		metadataFlag: 'revenue',
		ranking: {
			route: '/app-revenue/chains',
			name: 'App Revenue by Chain',
			tab: 'Chains',
			totalTrackedKey: 'revenue.chains',
			descriptionIncludes: ['apps on the chain', 'Excludes', 'gas fees'],
			builder: 'app-aggregation',
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
		},
		chainOverview: {
			chartKey: 'appRevenue',
			queryKey: 'app-revenue',
			phase: 'app_revenue',
			excludeAllChains: true,
			source: {
				kind: 'adapter-chain',
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
			}
		}
	},
	rev: {
		id: 'rev',
		label: 'REV',
		concept: 'rev',
		metadataFlag: 'chainFees',
		ranking: {
			route: '/rev/chains',
			name: 'REV by Chain',
			tab: 'Chains',
			totalTrackedKey: 'chainFees.chains',
			descriptionIncludes: ['chain fees and MEV tips'],
			builder: 'rev'
		}
	}
} as const satisfies Record<FeeRevenueMetricId, FeeRevenueMetric>

export function shouldFetchChainOverviewFeeRevenueMetric({
	metric,
	metadata,
	chain
}: {
	metric: ChainOverviewFeeRevenueMetric
	metadata: IChainMetadata
	chain: string
}): boolean {
	if (metric.chainOverview.excludeAllChains && chain === 'All') return false
	return !!metadata[metric.metadataFlag]
}
