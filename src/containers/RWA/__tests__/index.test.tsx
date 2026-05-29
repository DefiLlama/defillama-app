import { describe, expect, it } from 'vitest'
import { CHART_COLORS } from '~/constants/colors'
import { buildRwaTimeSeriesCharts } from '../index'

describe('buildRwaTimeSeriesCharts', () => {
	it('excludes renamed total series from tooltip totals without excluding rwa perps open interest', () => {
		expect(buildRwaTimeSeriesCharts(['timestamp', 'Total Onchain Mcap', 'RWA Perps OI', 'Bonds'])).toEqual([
			{
				name: 'Total Onchain Mcap',
				type: 'line',
				encode: { x: 'timestamp', y: 'Total Onchain Mcap' },
				color: CHART_COLORS[0],
				hideAreaStyle: true,
				excludeFromTooltipTotal: true
			},
			{
				name: 'RWA Perps OI',
				type: 'line',
				encode: { x: 'timestamp', y: 'RWA Perps OI' },
				color: CHART_COLORS[1],
				hideAreaStyle: true
			},
			{
				name: 'Bonds',
				type: 'line',
				encode: { x: 'timestamp', y: 'Bonds' },
				color: CHART_COLORS[2]
			}
		])
	})
})
