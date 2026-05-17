import { describe, expect, it } from 'vitest'
import { CHART_COLORS } from '~/constants/colors'
import {
	buildRWAPerpsOverviewChartSeries,
	getRWAPerpsOverviewChartType,
	getRWAPerpsOverviewChartTypeQueryPatch,
	getRWAPerpsOverviewTimeSeriesMode,
	getRWAPerpsOverviewTimeSeriesModeQueryPatch,
	getRWAPerpsChartDatasetForSelectedStacks,
	resolveRWAPerpsOverviewSelectedStacks
} from '../OverviewChart'

describe('OverviewChart helpers', () => {
	it('falls back to the default chart type for invalid query values', () => {
		expect(getRWAPerpsOverviewChartType(undefined)).toBe('openInterest')
		expect(getRWAPerpsOverviewChartType('invalid')).toBe('openInterest')
		expect(getRWAPerpsOverviewChartType('markets')).toBe('markets')
	})

	it('builds the expected chart-type query patch', () => {
		expect(getRWAPerpsOverviewChartTypeQueryPatch('openInterest')).toEqual({ chartType: undefined })
		expect(getRWAPerpsOverviewChartTypeQueryPatch('volume24h')).toEqual({ chartType: 'volume24h' })
	})

	it('falls back to total mode for invalid time-series mode values', () => {
		expect(getRWAPerpsOverviewTimeSeriesMode(undefined)).toBe('grouped')
		expect(getRWAPerpsOverviewTimeSeriesMode('invalid')).toBe('grouped')
		expect(getRWAPerpsOverviewTimeSeriesMode('breakdown')).toBe('breakdown')
	})

	it('builds the expected time-series-mode query patch', () => {
		expect(getRWAPerpsOverviewTimeSeriesModeQueryPatch('grouped')).toEqual({ timeSeriesMode: undefined })
		expect(getRWAPerpsOverviewTimeSeriesModeQueryPatch('breakdown')).toEqual({ timeSeriesMode: 'breakdown' })
	})

	it('prefers explicit selected stacks over excluded stacks and filters unknown values', () => {
		expect(
			resolveRWAPerpsOverviewSelectedStacks({
				stackOptions: ['Meta', 'NVIDIA'],
				selectedStacksQ: ['NVIDIA', 'Unknown'],
				excludeStacksQ: ['Meta']
			})
		).toEqual(['NVIDIA'])
	})

	it('supports the None sentinel and exclusion-based defaults', () => {
		expect(
			resolveRWAPerpsOverviewSelectedStacks({
				stackOptions: ['Meta', 'NVIDIA'],
				selectedStacksQ: 'None',
				excludeStacksQ: undefined
			})
		).toEqual([])

		expect(
			resolveRWAPerpsOverviewSelectedStacks({
				stackOptions: ['Meta', 'NVIDIA'],
				selectedStacksQ: undefined,
				excludeStacksQ: ['NVIDIA']
			})
		).toEqual(['Meta'])
	})

	it('slices selected stack datasets to the first non-null selected value', () => {
		const dataset = {
			source: [
				{ timestamp: 1, Total: 10, PreStocks: null, Securitize: 10 },
				{ timestamp: 2, Total: 11, PreStocks: null, Securitize: 11 },
				{ timestamp: 3, Total: 23, PreStocks: 12, Securitize: 11 },
				{ timestamp: 4, Total: 11, PreStocks: 0, Securitize: 11 }
			],
			dimensions: ['timestamp', 'Total', 'PreStocks', 'Securitize']
		}

		expect(
			getRWAPerpsChartDatasetForSelectedStacks(dataset, ['PreStocks'], ['PreStocks', 'Securitize']).source
		).toEqual([
			{ timestamp: 3, Total: 23, PreStocks: 12, Securitize: 11 },
			{ timestamp: 4, Total: 11, PreStocks: 0, Securitize: 11 }
		])
	})

	it('keeps the full dataset when all stacks are selected', () => {
		const dataset = {
			source: [
				{ timestamp: 1, PreStocks: null, Securitize: 10 },
				{ timestamp: 2, PreStocks: 12, Securitize: 11 }
			],
			dimensions: ['timestamp', 'PreStocks', 'Securitize']
		}

		expect(
			getRWAPerpsChartDatasetForSelectedStacks(dataset, ['PreStocks', 'Securitize'], ['PreStocks', 'Securitize'])
		).toBe(dataset)
	})

	it('builds line series without point markers for non-volume metrics', () => {
		const series = buildRWAPerpsOverviewChartSeries({
			chartType: 'openInterest',
			stackOptions: ['Meta'],
			timeSeriesMode: 'breakdown'
		})

		expect(series).toMatchObject([{ name: 'Meta', type: 'line' }])
		expect(series[0]).not.toHaveProperty('showSymbol')
	})

	it('builds bar series for volume charts', () => {
		expect(
			buildRWAPerpsOverviewChartSeries({
				chartType: 'volume24h',
				stackOptions: ['Meta', 'NVIDIA'],
				timeSeriesMode: 'breakdown'
			})
		).toMatchObject([
			{ name: 'Meta', type: 'bar', stack: 'A' },
			{ name: 'NVIDIA', type: 'bar', stack: 'A' }
		])
	})

	it('builds a total series when the grouped dataset only exposes Total', () => {
		expect(
			buildRWAPerpsOverviewChartSeries({
				chartType: 'markets',
				stackOptions: ['Total'],
				timeSeriesMode: 'grouped'
			})
		).toMatchObject([{ name: 'Total', type: 'line' }])
	})

	it('adds a plain total line ahead of the breakdown color scale for breakdown line charts', () => {
		expect(
			buildRWAPerpsOverviewChartSeries({
				chartType: 'openInterest',
				stackOptions: ['Total', 'Meta', 'NVIDIA'],
				timeSeriesMode: 'breakdown'
			})
		).toEqual([
			{
				name: 'Meta',
				type: 'line',
				encode: { x: 'timestamp', y: 'Meta' },
				color: CHART_COLORS[1]
			},
			{
				name: 'NVIDIA',
				type: 'line',
				encode: { x: 'timestamp', y: 'NVIDIA' },
				color: CHART_COLORS[2]
			},
			{
				name: 'Total',
				type: 'line',
				encode: { x: 'timestamp', y: 'Total' },
				color: CHART_COLORS[0],
				hideAreaStyle: true,
				excludeFromTooltipTotal: true
			}
		])
	})

	it('does not add a total overlay to breakdown bar charts', () => {
		expect(
			buildRWAPerpsOverviewChartSeries({
				chartType: 'volume24h',
				stackOptions: ['Total', 'Meta', 'NVIDIA'],
				timeSeriesMode: 'breakdown'
			})
		).toEqual([
			{
				name: 'Total',
				type: 'bar',
				stack: 'A',
				encode: { x: 'timestamp', y: 'Total' },
				color: CHART_COLORS[0]
			},
			{
				name: 'Meta',
				type: 'bar',
				stack: 'A',
				encode: { x: 'timestamp', y: 'Meta' },
				color: CHART_COLORS[1]
			},
			{
				name: 'NVIDIA',
				type: 'bar',
				stack: 'A',
				encode: { x: 'timestamp', y: 'NVIDIA' },
				color: CHART_COLORS[2]
			}
		])
	})
})
