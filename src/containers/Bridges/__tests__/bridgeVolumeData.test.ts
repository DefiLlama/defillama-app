import { describe, expect, it } from 'vitest'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import {
	BRIDGE_VOLUME_COMBINED_CHARTS,
	BRIDGE_VOLUME_SPLIT_CHARTS,
	buildBridgeVolumeChartData
} from '../bridgeVolumeData'

describe('buildBridgeVolumeChartData', () => {
	it('builds daily split volume rows in chronological order', () => {
		const result = buildBridgeVolumeChartData({
			data: [
				{ date: 2, depositUSD: 20, withdrawUSD: 5 },
				{ date: 1, depositUSD: 10, withdrawUSD: 3 }
			],
			timePeriod: 'daily',
			metricType: 'Volume',
			viewType: 'Split'
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Deposits', 'Withdrawals'],
			source: [
				{ timestamp: 1_000, Deposits: 10, Withdrawals: -3 },
				{ timestamp: 2_000, Deposits: 20, Withdrawals: -5 }
			]
		})
		expect(result.charts).toBe(BRIDGE_VOLUME_SPLIT_CHARTS)
	})

	it('groups combined transaction rows by selected period', () => {
		const day1 = 1_704_067_200
		const day2 = 1_704_153_600
		const bucket = getBucketTimestampSec(day1, 'weekly')
		const result = buildBridgeVolumeChartData({
			data: [
				{ date: day2, depositTxs: 7, withdrawTxs: 2 },
				{ date: day1, depositTxs: 3, withdrawTxs: 1 }
			],
			timePeriod: 'weekly',
			metricType: 'Transactions',
			viewType: 'Combined'
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Total'],
			source: [{ timestamp: bucket * 1e3, Total: 13 }]
		})
		expect(result.charts).toBe(BRIDGE_VOLUME_COMBINED_CHARTS)
	})

	it('keeps empty combined datasets dimensioned for the active view', () => {
		const result = buildBridgeVolumeChartData({
			data: [],
			timePeriod: 'monthly',
			metricType: 'Volume',
			viewType: 'Combined'
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Total'],
			source: []
		})
	})
})
