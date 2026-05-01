import { describe, expect, it } from 'vitest'
import type { AdaptedLlamaAICartesianChart } from '~/containers/LlamaAI/utils/chartAdapter'
import type { ChartCapabilities, ChartViewState } from '~/containers/LlamaAI/utils/chartCapabilities'
import { ChartDataTransformer } from './chartDataTransformer'

const capabilities: ChartCapabilities = {
	allowStack: true,
	allowPercentage: true,
	allowCumulative: false,
	allowGrouping: false,
	allowHallmarks: false,
	allowLabels: false,
	groupingOptions: []
}

const viewState: ChartViewState = {
	stacked: false,
	percentage: true,
	cumulative: false,
	grouping: 'day',
	showHallmarks: false,
	showLabels: false
}

function makeMixedAxisChart(axisType: 'time' | 'category'): AdaptedLlamaAICartesianChart {
	const dimensionName = axisType === 'time' ? 'timestamp' : 'category'
	const xValue = axisType === 'time' ? Date.UTC(2026, 0, 1) : 'Protocols'

	return {
		chartType: 'cartesian',
		props: {
			dataset: {
				dimensions: [dimensionName, 'Primary A', 'Primary B', 'Secondary'],
				source: [{ [dimensionName]: xValue, 'Primary A': 20, 'Primary B': 30, Secondary: 5 }]
			},
			charts: [
				{
					type: 'line',
					name: 'Primary A',
					encode: { x: dimensionName, y: 'Primary A' },
					color: '#111',
					valueSymbol: '$',
					yAxisIndex: 0
				},
				{
					type: 'line',
					name: 'Primary B',
					encode: { x: dimensionName, y: 'Primary B' },
					color: '#222',
					valueSymbol: '$',
					yAxisIndex: 0
				},
				{
					type: 'line',
					name: 'Secondary',
					encode: { x: dimensionName, y: 'Secondary' },
					color: '#333',
					valueSymbol: '$',
					yAxisIndex: 1
				}
			],
			chartOptions: {},
			valueSymbol: '$'
		},
		title: 'Mixed axes',
		description: '',
		rowCount: 1,
		axisType,
		isTimeChart: axisType === 'time',
		hasHallmarks: false,
		groupingPolicy: axisType === 'time' ? 'always' : 'never',
		defaultExportKind: 'cartesian',
		seriesMeta: [
			{
				name: 'Primary A',
				seriesIndex: 0,
				metricClass: 'stock',
				baseType: 'line',
				resolvedColor: '#111',
				valueSymbol: '$',
				yAxisIndex: 0,
				isPrimaryAxis: true,
				canStack: true,
				canPercentage: true,
				canGroup: axisType === 'time'
			},
			{
				name: 'Primary B',
				seriesIndex: 1,
				metricClass: 'stock',
				baseType: 'line',
				resolvedColor: '#222',
				valueSymbol: '$',
				yAxisIndex: 0,
				isPrimaryAxis: true,
				canStack: true,
				canPercentage: true,
				canGroup: axisType === 'time'
			},
			{
				name: 'Secondary',
				seriesIndex: 2,
				metricClass: 'stock',
				baseType: 'line',
				resolvedColor: '#333',
				valueSymbol: '$',
				yAxisIndex: 1,
				isPrimaryAxis: false,
				canStack: false,
				canPercentage: false,
				canGroup: axisType === 'time'
			}
		]
	}
}

describe('ChartDataTransformer', () => {
	it('keeps secondary-axis symbols in percentage tooltips for time charts', () => {
		const transformed = ChartDataTransformer.applyViewState(makeMixedAxisChart('time'), viewState, capabilities)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const formatter = transformed.props.chartOptions?.tooltip?.formatter
		expect(typeof formatter).toBe('function')

		const row = transformed.props.dataset.source[0]
		const tooltip = formatter([
			{ seriesName: 'Primary A', data: row, color: '#111' },
			{ seriesName: 'Primary B', data: row, color: '#222' },
			{ seriesName: 'Secondary', data: row, color: '#333' }
		])

		expect(tooltip).toContain('Primary A: <strong>40%</strong>')
		expect(tooltip).toContain('Primary B: <strong>60%</strong>')
		expect(tooltip).toContain('Secondary: <strong>$5</strong>')
	})

	it('keeps secondary-axis symbols in percentage tooltips for category charts', () => {
		const transformed = ChartDataTransformer.applyViewState(makeMixedAxisChart('category'), viewState, capabilities)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const formatter = transformed.props.chartOptions?.tooltip?.formatter
		expect(typeof formatter).toBe('function')

		const row = transformed.props.dataset.source[0]
		const tooltip = formatter([
			{ seriesName: 'Primary A', data: row, marker: '' },
			{ seriesName: 'Primary B', data: row, marker: '' },
			{ seriesName: 'Secondary', data: row, marker: '' }
		])

		expect(tooltip).toContain('Primary A: 40%')
		expect(tooltip).toContain('Primary B: 60%')
		expect(tooltip).toContain('Secondary: $5')
	})
})
