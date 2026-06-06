import { describe, expect, it } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { feeRevenueMetrics, shouldFetchChainOverviewFeeRevenueMetric } from '~/metrics/feesRevenue'
import {
	getChainNativeFeeRevenueMetricForAdapterProtocol,
	getFeeRevenueChainChartApiParams
} from '~/metrics/routeSemantics'

describe('fee/revenue metric semantics', () => {
	it('keeps chain-native fees and revenue on adapter protocol chart paths', () => {
		expect(
			getFeeRevenueChainChartApiParams({
				metric: feeRevenueMetrics.chainFees,
				chain: 'Base'
			})
		).toEqual({
			kind: 'adapter-protocol',
			entity: 'chain',
			adapterType: ADAPTER_TYPES.FEES,
			protocol: 'Base',
			dataType: undefined
		})

		expect(
			getFeeRevenueChainChartApiParams({
				metric: feeRevenueMetrics.chainRevenue,
				chain: 'Base'
			})
		).toEqual({
			kind: 'adapter-protocol',
			entity: 'chain',
			adapterType: ADAPTER_TYPES.FEES,
			protocol: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
		})
	})

	it('keeps app fees and app revenue on adapter chain chart paths', () => {
		expect(
			getFeeRevenueChainChartApiParams({
				metric: feeRevenueMetrics.appFees,
				chain: 'Base'
			})
		).toEqual({
			kind: 'adapter-chain',
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
		})

		expect(
			getFeeRevenueChainChartApiParams({
				metric: feeRevenueMetrics.appRevenue,
				chain: 'Base'
			})
		).toEqual({
			kind: 'adapter-chain',
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
		})
	})

	it('maps each metric to the metadata flag that gates server fetching', () => {
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.chainFees,
				metadata: { id: 'base', name: 'Base', chainFees: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.chainRevenue,
				metadata: { id: 'base', name: 'Base', chainRevenue: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.appFees,
				metadata: { id: 'base', name: 'Base', fees: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.appRevenue,
				metadata: { id: 'base', name: 'Base', revenue: true },
				chain: 'base'
			})
		).toBe(true)
	})

	it('does not fetch app aggregation metrics for the All chain overview', () => {
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.appFees,
				metadata: { id: 'all', name: 'All', fees: true },
				chain: 'All'
			})
		).toBe(false)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: feeRevenueMetrics.appRevenue,
				metadata: { id: 'all', name: 'All', revenue: true },
				chain: 'All'
			})
		).toBe(false)
	})

	it('maps only chain-native fees and revenue to adapter protocol chain fallback semantics', () => {
		expect(
			getChainNativeFeeRevenueMetricForAdapterProtocol({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: undefined
			})
		).toBe(feeRevenueMetrics.chainFees)
		expect(
			getChainNativeFeeRevenueMetricForAdapterProtocol({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_FEES
			})
		).toBe(feeRevenueMetrics.chainFees)
		expect(
			getChainNativeFeeRevenueMetricForAdapterProtocol({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
			})
		).toBe(feeRevenueMetrics.chainRevenue)
		expect(
			getChainNativeFeeRevenueMetricForAdapterProtocol({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
			})
		).toBeNull()
		expect(
			getChainNativeFeeRevenueMetricForAdapterProtocol({
				adapterType: ADAPTER_TYPES.DEXS,
				dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME
			})
		).toBeNull()
	})
})
