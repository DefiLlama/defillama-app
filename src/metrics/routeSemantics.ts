import type { ChainNativeFeeRevenueMetric, ChainOverviewFeeRevenueMetric } from './definitions'
import { feeRevenueMetrics } from './feesRevenue'

export function getFeeRevenueChainChartApiParams({
	metric,
	chain
}: {
	metric: ChainOverviewFeeRevenueMetric
	chain: string
}): Record<string, string | undefined> {
	const { source } = metric.chainOverview

	if (source.kind === 'adapter-protocol') {
		return {
			kind: source.kind,
			entity: source.entity,
			adapterType: source.adapterType,
			protocol: chain,
			dataType: source.dataType
		}
	}

	return {
		kind: source.kind,
		adapterType: source.adapterType,
		chain,
		dataType: source.dataType
	}
}

export function getChainNativeFeeRevenueMetricForAdapterProtocol({
	adapterType,
	dataType
}: {
	adapterType: string
	dataType: string | undefined
}): ChainNativeFeeRevenueMetric | null {
	// Chain Fees/Revenue are chain-level economics, but upstream exposes their
	// series through the adapter protocol chart path. Only these two data types
	// are allowed to use the chain metadata fallback.
	if (adapterType !== 'fees') return null
	if (!dataType || dataType === 'dailyFees') return feeRevenueMetrics.chainFees
	if (dataType === 'dailyRevenue') return feeRevenueMetrics.chainRevenue
	return null
}
