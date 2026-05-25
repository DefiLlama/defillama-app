import { describe, expect, it } from 'vitest'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { adaptCartesianChartData } from '~/containers/LlamaAI/utils/chartAdapters/cartesian'
import { adaptHBarChartData } from '~/containers/LlamaAI/utils/chartAdapters/hbar'
import { adaptPieChartData } from '~/containers/LlamaAI/utils/chartAdapters/pie'
import { adaptScatterChartData } from '~/containers/LlamaAI/utils/chartAdapters/scatter'

const baseConfig: ChartConfiguration = {
	id: 'chart-1',
	type: 'scatter',
	title: 'Chart',
	description: 'Chart description',
	axes: {
		x: { field: 'x', label: 'X', type: 'value' },
		yAxes: [{ id: 'left', fields: ['y'], label: 'Y', position: 'left' }]
	},
	series: [
		{
			name: 'Series',
			type: 'scatter',
			yAxisId: 'left',
			metricClass: 'stock',
			dataMapping: { xField: 'x', yField: 'y', entityFilter: { field: 'protocol', value: 'all' } },
			styling: {}
		}
	],
	dataTransformation: { timeField: 'x', metrics: ['y'] },
	displayOptions: {
		canStack: false,
		canShowPercentage: false,
		canShowCumulative: false,
		supportsGrouping: false
	}
}

describe('chart adapters', () => {
	it('preserves falsy category labels in cartesian, pie, hbar, and scatter adapters', () => {
		const categoryConfig = {
			...baseConfig,
			type: 'bar',
			axes: { ...baseConfig.axes, x: { field: 'x', label: 'X', type: 'category' as const } },
			series: [
				{
					...baseConfig.series[0]!,
					type: 'bar' as const,
					dataMapping: { xField: 'x', yField: 'y' }
				}
			]
		} satisfies ChartConfiguration

		expect(adaptCartesianChartData(categoryConfig, [{ x: 0, y: 1 }]).props.dataset.source[0]).toMatchObject({
			category: '0'
		})
		expect(adaptPieChartData({ ...baseConfig, type: 'pie' }, [{ x: 0, y: 1 }]).props.chartData).toEqual([
			{ name: '0', value: 1 }
		])
		expect(
			adaptHBarChartData({ ...baseConfig, type: 'hbar', series: [{ ...baseConfig.series[0]!, type: 'hbar' }] }, [
				{ x: 0, y: 1 }
			]).data
		).toEqual([['0', 1]])
		expect(adaptScatterChartData(baseConfig, [{ x: 1, y: 2, protocol: 0 }]).props.chartData).toEqual([[1, 2, '0', '0']])
	})

	it('escapes scatter tooltip entity names', () => {
		const result = adaptScatterChartData(baseConfig, [{ x: 1, y: 2, protocol: '<img src=x onerror=alert(1)>' }])
		const tooltip = result.props.tooltipFormatter?.({ value: [1, 2, '<img src=x onerror=alert(1)>'] })

		expect(tooltip).toContain('&lt;img src=x onerror=alert(1)&gt;')
		expect(tooltip).not.toContain('<img src=x')
	})

	it('keeps cartesian time-series rows sorted after adaptation', () => {
		const timeConfig = {
			...baseConfig,
			type: 'line',
			axes: { ...baseConfig.axes, x: { field: 'timestamp', label: 'Date', type: 'time' as const } },
			series: [
				{
					...baseConfig.series[0]!,
					type: 'line' as const,
					dataMapping: { xField: 'timestamp', yField: 'y' }
				}
			],
			dataTransformation: { timeField: 'timestamp', metrics: ['y'] }
		} satisfies ChartConfiguration

		const result = adaptCartesianChartData(timeConfig, [
			{ timestamp: Date.UTC(2026, 2, 1), y: 3 },
			{ timestamp: Date.UTC(2026, 0, 1), y: 1 },
			{ timestamp: Date.UTC(2026, 1, 1), y: 2 }
		])

		expect(result.props.dataset.source.map((row) => row.timestamp)).toEqual([
			Date.UTC(2026, 0, 1),
			Date.UTC(2026, 1, 1),
			Date.UTC(2026, 2, 1)
		])
	})
})
