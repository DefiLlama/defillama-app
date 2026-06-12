import { describe, expect, it } from 'vitest'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import { buildLstBreakdownChartData, buildLstInflowsData, buildLstInflowsSeriesData } from '../chartData'

describe('LST chart data helpers', () => {
	it('builds cumulative inflows by token', () => {
		const result = buildLstInflowsData({
			inflowsChartData: {
				1: { Lido: 10, RocketPool: 5 },
				2: { Lido: 3, RocketPool: -2 }
			},
			groupBy: 'cumulative'
		})

		expect(result).toEqual([
			{ date: 1, Lido: 10, RocketPool: 5 },
			{ date: 2, Lido: 13, RocketPool: 3 }
		])
	})

	it('groups non-cumulative inflows by selected period', () => {
		const day1 = 1_704_067_200
		const day2 = 1_704_153_600
		const bucket = getBucketTimestampSec(day1, 'weekly')
		const result = buildLstInflowsData({
			inflowsChartData: {
				[day2]: { Lido: 7 },
				[day1]: { Lido: 3, RocketPool: 1 }
			},
			groupBy: 'weekly'
		})

		expect(result).toEqual([{ date: bucket, Lido: 10, RocketPool: 1 }])
	})

	it('builds breakdown and inflow datasets with stable token chart configs', () => {
		const tokens = ['Lido', 'RocketPool']
		const lsdColors = { Lido: '#111', RocketPool: '#222' }

		expect(
			buildLstBreakdownChartData({
				areaChartData: [{ date: 1, Lido: 75, RocketPool: 25 }],
				tokens,
				lsdColors
			})
		).toEqual({
			dataset: {
				source: [{ timestamp: 1_000, Lido: 75, RocketPool: 25 }],
				dimensions: ['timestamp', 'Lido', 'RocketPool']
			},
			charts: [
				{ type: 'line', name: 'Lido', encode: { x: 'timestamp', y: 'Lido' }, color: '#111', stack: 'breakdown' },
				{
					type: 'line',
					name: 'RocketPool',
					encode: { x: 'timestamp', y: 'RocketPool' },
					color: '#222',
					stack: 'breakdown'
				}
			]
		})

		const inflowsSeriesData = buildLstInflowsSeriesData({
			inflowsData: [{ date: 1, Lido: 10, RocketPool: -1 }],
			tokens,
			lsdColors,
			barChartStacks: { Lido: 'A', RocketPool: 'A' }
		})

		expect(inflowsSeriesData.dataset).toEqual({
			source: [{ timestamp: 1_000, Lido: 10, RocketPool: -1 }],
			dimensions: ['timestamp', 'Lido', 'RocketPool']
		})
		expect(inflowsSeriesData.barCharts).toEqual([
			{
				type: 'bar',
				name: 'Lido',
				encode: { x: 'timestamp', y: 'Lido' },
				color: '#111',
				stack: 'A',
				large: false
			},
			{
				type: 'bar',
				name: 'RocketPool',
				encode: { x: 'timestamp', y: 'RocketPool' },
				color: '#222',
				stack: 'A',
				large: false
			}
		])
		expect(inflowsSeriesData.cumulativeCharts).toEqual([
			{
				type: 'line',
				name: 'Lido',
				encode: { x: 'timestamp', y: 'Lido' },
				color: '#111'
			},
			{
				type: 'line',
				name: 'RocketPool',
				encode: { x: 'timestamp', y: 'RocketPool' },
				color: '#222'
			}
		])
	})
})
