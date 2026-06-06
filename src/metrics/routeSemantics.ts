import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import type { ChainNativeFeeRevenueMetric, FeeRevenueMetric } from './definitions'
import { feeRevenueMetrics } from './feesRevenue'

export function getFeeRevenueChainChartApiParams({
	metric,
	chain
}: {
	metric: FeeRevenueMetric
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
	if (adapterType !== ADAPTER_TYPES.FEES) return null
	if (!dataType || dataType === ADAPTER_DATA_TYPES.DAILY_FEES) return feeRevenueMetrics.chainFees
	if (dataType === ADAPTER_DATA_TYPES.DAILY_REVENUE) return feeRevenueMetrics.chainRevenue
	return null
}
