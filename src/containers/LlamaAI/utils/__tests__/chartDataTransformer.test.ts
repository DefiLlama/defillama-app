import { describe, expect, it } from 'vitest'
import type { AdaptedLlamaAICartesianChart } from '~/containers/LlamaAI/utils/chartAdapter'
import type { ChartCapabilities, ChartViewState } from '~/containers/LlamaAI/utils/chartCapabilities'
import { ChartDataTransformer } from '../chartDataTransformer'

const capabilities: ChartCapabilities = {
	allowStack: true,
	allowPercentage: true,
	allowCumulative: false,
	allowGrouping: false,
	allowHallmarks: false,
	allowLabels: false,
	allowLogScale: false,
	logEligibleYAxes: [],
	groupingOptions: []
}

const viewState: ChartViewState = {
	stacked: false,
	percentage: true,
	cumulative: false,
	grouping: 'day',
	showHallmarks: false,
	showLabels: false,
	logScale: false
}

const logViewState: ChartViewState = {
	...viewState,
	percentage: false,
	logScale: true
}

const logCapabilities: ChartCapabilities = {
	...capabilities,
	allowPercentage: false,
	allowLogScale: true,
	logEligibleYAxes: [0]
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

function makeUnsortedTimeChart(): AdaptedLlamaAICartesianChart {
	const mar = Date.UTC(2026, 2, 1)
	const jan = Date.UTC(2026, 0, 1)
	const feb = Date.UTC(2026, 1, 1)

	return {
		chartType: 'cartesian',
		props: {
			dataset: {
				dimensions: ['timestamp', 'Revenue'],
				source: [
					{ timestamp: mar, Revenue: 30 },
					{ timestamp: jan, Revenue: 10 },
					{ timestamp: feb, Revenue: 20 }
				]
			},
			charts: [
				{
					type: 'line',
					name: 'Revenue',
					encode: { x: 'timestamp', y: 'Revenue' },
					color: '#111',
					valueSymbol: '$',
					yAxisIndex: 0
				}
			],
			chartOptions: {},
			valueSymbol: '$'
		},
		title: 'Unsorted',
		description: '',
		rowCount: 3,
		axisType: 'time',
		isTimeChart: true,
		hasHallmarks: false,
		groupingPolicy: 'always',
		defaultExportKind: 'cartesian',
		seriesMeta: [
			{
				name: 'Revenue',
				seriesIndex: 0,
				metricClass: 'flow',
				baseType: 'line',
				resolvedColor: '#111',
				valueSymbol: '$',
				yAxisIndex: 0,
				isPrimaryAxis: true,
				canStack: true,
				canPercentage: true,
				canGroup: true
			}
		]
	}
}

function makeLegacyTimestampChart(): AdaptedLlamaAICartesianChart {
	const chart = makeUnsortedTimeChart()
	chart.props.dataset.source = [
		{ timestamp: String(Date.UTC(2026, 0, 1)), Revenue: 10 },
		{ timestamp: 'not-a-date', Revenue: 999 },
		{ timestamp: Date.UTC(2026, 1, 1), Revenue: 20 }
	]
	chart.rowCount = chart.props.dataset.source.length
	return chart
}

describe('ChartDataTransformer', () => {
	it('keeps secondary-axis symbols in percentage tooltips for time charts', () => {
		const transformed = ChartDataTransformer.applyViewState(makeMixedAxisChart('time'), viewState, capabilities)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const formatter = transformed.props.chartOptions?.tooltip?.formatter
		if (typeof formatter !== 'function') throw new Error('Expected tooltip formatter')

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
		if (typeof formatter !== 'function') throw new Error('Expected tooltip formatter')

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

	it('keeps grouped rows timestamp-sorted after rebuilding from formatter output', () => {
		const transformed = ChartDataTransformer.applyViewState(
			makeUnsortedTimeChart(),
			{ ...viewState, grouping: 'month', percentage: false },
			{ ...capabilities, allowGrouping: true }
		)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		expect(transformed.props.dataset.source.map((row) => row.timestamp)).toEqual([
			Date.UTC(2026, 0, 1),
			Date.UTC(2026, 1, 1),
			Date.UTC(2026, 2, 1)
		])
	})

	it('keeps cumulative rows timestamp-sorted after rebuilding from formatter output', () => {
		const transformed = ChartDataTransformer.applyViewState(
			makeUnsortedTimeChart(),
			{ ...viewState, cumulative: true, percentage: false },
			{ ...capabilities, allowCumulative: true }
		)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		expect(transformed.props.dataset.source.map((row) => row.timestamp)).toEqual([
			Date.UTC(2026, 0, 1),
			Date.UTC(2026, 1, 1),
			Date.UTC(2026, 2, 1)
		])
	})

	it('groups legacy string timestamps and skips malformed timestamps', () => {
		const transformed = ChartDataTransformer.applyViewState(
			makeLegacyTimestampChart(),
			{ ...viewState, grouping: 'month', percentage: false },
			{ ...capabilities, allowGrouping: true }
		)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		expect(transformed.props.dataset.source).toEqual([
			{ timestamp: Date.UTC(2026, 0, 1), Revenue: 10 },
			{ timestamp: Date.UTC(2026, 1, 1), Revenue: 20 }
		])
	})

	it('applies cumulative view to legacy string timestamps and skips malformed timestamps', () => {
		const transformed = ChartDataTransformer.applyViewState(
			makeLegacyTimestampChart(),
			{ ...viewState, cumulative: true, percentage: false },
			{ ...capabilities, allowCumulative: true }
		)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		expect(transformed.props.dataset.source).toEqual([
			{ timestamp: Date.UTC(2026, 0, 1), Revenue: 10 },
			{ timestamp: Date.UTC(2026, 1, 1), Revenue: 30 }
		])
	})

	it('clears non-positive lower bounds when applying log scale', () => {
		const chart = makeMixedAxisChart('time')
		chart.props.chartOptions = { yAxis: [{ min: 0 }, { min: 0 }] } as any

		const transformed = ChartDataTransformer.applyViewState(chart, logViewState, logCapabilities)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const yAxis = transformed.props.chartOptions?.yAxis as unknown as any[]

		expect(yAxis[0].type).toBe('log')
		expect(Object.prototype.hasOwnProperty.call(yAxis[0], 'min')).toBe(true)
		expect(yAxis[0].min).toBeUndefined()
		expect(yAxis[1].type).toBeUndefined()
		expect(yAxis[1].min).toBe(0)
	})

	it('preserves valid lower bounds when applying log scale', () => {
		const chart = makeMixedAxisChart('time')
		chart.props.chartOptions = { yAxis: { min: 10 } } as any

		const transformed = ChartDataTransformer.applyViewState(chart, logViewState, logCapabilities)
		if (transformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const yAxis = transformed.props.chartOptions?.yAxis as any

		expect(yAxis.type).toBe('log')
		expect(yAxis.min).toBe(10)

		const dataMinChart = makeMixedAxisChart('time')
		dataMinChart.props.chartOptions = { yAxis: { min: 'dataMin' } } as any

		const dataMinTransformed = ChartDataTransformer.applyViewState(dataMinChart, logViewState, logCapabilities)
		if (dataMinTransformed.chartType !== 'cartesian') throw new Error('Expected cartesian chart')

		const dataMinYAxis = dataMinTransformed.props.chartOptions?.yAxis as any

		expect(dataMinYAxis.type).toBe('log')
		expect(dataMinYAxis.min).toBe('dataMin')
	})
})
