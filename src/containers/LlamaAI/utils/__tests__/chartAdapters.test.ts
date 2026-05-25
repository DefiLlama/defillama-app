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

	it('keeps legacy blank category labels as Unknown while preserving numeric zero', () => {
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

		const result = adaptCartesianChartData(categoryConfig, [
			{ x: '', y: 1 },
			{ x: 0, y: 2 }
		])

		expect(result.props.dataset.source).toEqual([
			{ category: 'Unknown', Series: 1 },
			{ category: '0', Series: 2 }
		])
	})

	it('filters scatter rows with missing or non-numeric coordinates', () => {
		const result = adaptScatterChartData(baseConfig, [
			{ x: 1, y: 2, protocol: 'valid' },
			{ x: null, y: 3, protocol: 'null-x' },
			{ x: 'bad', y: 4, protocol: 'bad-x' },
			{ x: 5, y: undefined, protocol: 'missing-y' },
			{ x: '6.5', y: '7.5', protocol: 'string-coords' }
		])

		expect(result.props.chartData).toEqual([
			[1, 2, 'valid', 'valid'],
			[6.5, 7.5, 'string-coords', 'string-coords']
		])
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

	it('filters candlestick rows with invalid timestamps before building indicators', () => {
		const timestamp = Date.UTC(2026, 0, 1)
		const config = {
			...baseConfig,
			type: 'candlestick',
			axes: { ...baseConfig.axes, x: { field: 'timestamp', label: 'Date', type: 'time' as const } },
			series: [
				{
					...baseConfig.series[0]!,
					type: 'candlestick' as const,
					dataMapping: { xField: 'timestamp', yField: 'close' }
				}
			],
			dataTransformation: { timeField: 'timestamp', metrics: ['open', 'high', 'low', 'close'] }
		} satisfies ChartConfiguration

		const result = adaptCandlestickData(config, [
			{
				timestamp: 'bad',
				open: 1,
				high: 3,
				low: 0,
				close: 2,
				volume: 10,
				sma_7: 4,
				rsi: 60
			},
			{
				timestamp,
				open: 2,
				high: 5,
				low: 1,
				close: 4,
				volume: 20,
				sma_7: 3,
				rsi: 55
			}
		])

		expect(result.data).toHaveLength(1)
		expect(result.data[0]?.[0]).toBe(timestamp)
		expect(result.indicators?.every((indicator) => indicator.data?.length === 1)).toBe(true)
	})
})
