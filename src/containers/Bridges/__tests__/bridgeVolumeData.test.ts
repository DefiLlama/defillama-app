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
				{ date: '2', depositUSD: 20, withdrawUSD: 5, depositTxs: 2, withdrawTxs: 1 },
				{ date: '1', depositUSD: 10, withdrawUSD: 3, depositTxs: 1, withdrawTxs: 1 }
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
		const day9 = day1 + 8 * 86_400
		const bucket = getBucketTimestampSec(day1, 'weekly')
		const nextBucket = getBucketTimestampSec(day9, 'weekly')
		const result = buildBridgeVolumeChartData({
			data: [
				{ date: String(day9), depositUSD: 40, withdrawUSD: 30, depositTxs: 4, withdrawTxs: 3 },
				{ date: String(day2), depositUSD: 70, withdrawUSD: 20, depositTxs: 7, withdrawTxs: 2 },
				{ date: String(day1), depositUSD: 30, withdrawUSD: 10, depositTxs: 3, withdrawTxs: 1 }
			],
			timePeriod: 'weekly',
			metricType: 'Transactions',
			viewType: 'Combined'
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Total'],
			source: [
				{ timestamp: bucket * 1e3, Total: 13 },
				{ timestamp: nextBucket * 1e3, Total: 7 }
			]
		})
		expect(result.charts).toBe(BRIDGE_VOLUME_COMBINED_CHARTS)
	})

	it('treats omitted raw bridge metric sides as zero', () => {
		const result = buildBridgeVolumeChartData({
			data: [
				// @ts-expect-error raw bridge rows can omit a side-specific metric key
				{ date: '1', depositUSD: 10, depositTxs: 2 },
				// @ts-expect-error raw bridge rows can omit a side-specific metric key
				{ date: '2', withdrawUSD: 5, withdrawTxs: 1 }
			],
			timePeriod: 'daily',
			metricType: 'Volume',
			viewType: 'Combined'
		})

		expect(result.dataset.source).toEqual([
			{ timestamp: 1_000, Total: 10 },
			{ timestamp: 2_000, Total: 5 }
		])
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
