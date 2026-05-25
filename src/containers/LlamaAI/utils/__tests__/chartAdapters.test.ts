import { describe, expect, it } from 'vitest'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import { adaptCandlestickData } from '~/containers/LlamaAI/utils/chartAdapters/candlestick'
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
	it('drops scatter rows with invalid numeric coordinates', () => {
		const result = adaptScatterChartData(baseConfig, [
			{ x: '1', y: '2', protocol: 'Valid Protocol' },
			{ x: 'N/A', y: null, protocol: 'Invalid Protocol' }
		])

		expect(result.props.chartData).toEqual([[1, 2, 'Valid Protocol', 'valid-protocol']])
	})

	it('drops hbar rows with invalid numeric values', () => {
		const result = adaptHBarChartData(
			{ ...baseConfig, type: 'hbar', series: [{ ...baseConfig.series[0]!, type: 'hbar' }] },
			[
				{ x: 'Valid Protocol', y: '100' },
				{ x: 'Invalid Protocol', y: 'N/A' }
			]
		)

		expect(result.data).toEqual([['Valid Protocol', 100]])
	})

	it('filters candlestick rows with invalid timestamps before building series', () => {
		const result = adaptCandlestickData(
			{
				...baseConfig,
				type: 'candlestick',
				series: [{ ...baseConfig.series[0]!, type: 'candlestick' }],
				dataTransformation: { timeField: 'timestamp', metrics: ['open', 'high', 'low', 'close'] }
			},
			[
				{ timestamp: '2024-01-01', open: 1, high: 3, low: 0.5, close: 2, volume: 10 },
				{ timestamp: 'not-a-date', open: 2, high: 4, low: 1, close: 3, volume: 20 }
			]
		)

		expect(result.data).toHaveLength(1)
		expect(result.data[0]?.[0]).toBe(Date.UTC(2024, 0, 1))
	})

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
})
