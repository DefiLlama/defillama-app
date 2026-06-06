import { describe, expect, it } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import {
	chainOverviewFeeRevenueMetrics,
	getChainOverviewFeeRevenueChartApiParams,
	shouldFetchChainOverviewFeeRevenueMetric
} from '../metricSemantics'

describe('ChainOverview metric semantics', () => {
	it('keeps chain-native fees and revenue on adapter protocol chart paths', () => {
		expect(
			getChainOverviewFeeRevenueChartApiParams({
				metric: chainOverviewFeeRevenueMetrics.chainFees,
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
			getChainOverviewFeeRevenueChartApiParams({
				metric: chainOverviewFeeRevenueMetrics.chainRevenue,
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
			getChainOverviewFeeRevenueChartApiParams({
				metric: chainOverviewFeeRevenueMetrics.appFees,
				chain: 'Base'
			})
		).toEqual({
			kind: 'adapter-chain',
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
		})

		expect(
			getChainOverviewFeeRevenueChartApiParams({
				metric: chainOverviewFeeRevenueMetrics.appRevenue,
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
				metric: chainOverviewFeeRevenueMetrics.chainFees,
				metadata: { id: 'base', name: 'Base', chainFees: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: chainOverviewFeeRevenueMetrics.chainRevenue,
				metadata: { id: 'base', name: 'Base', chainRevenue: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: chainOverviewFeeRevenueMetrics.appFees,
				metadata: { id: 'base', name: 'Base', fees: true },
				chain: 'base'
			})
		).toBe(true)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: chainOverviewFeeRevenueMetrics.appRevenue,
				metadata: { id: 'base', name: 'Base', revenue: true },
				chain: 'base'
			})
		).toBe(true)
	})

	it('does not fetch app aggregation metrics for the All chain overview', () => {
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: chainOverviewFeeRevenueMetrics.appFees,
				metadata: { id: 'all', name: 'All', fees: true },
				chain: 'All'
			})
		).toBe(false)
		expect(
			shouldFetchChainOverviewFeeRevenueMetric({
				metric: chainOverviewFeeRevenueMetrics.appRevenue,
				metadata: { id: 'all', name: 'All', revenue: true },
				chain: 'All'
			})
		).toBe(false)
	})
})
