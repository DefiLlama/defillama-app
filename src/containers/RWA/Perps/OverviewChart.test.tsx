import { describe, expect, it } from 'vitest'
import {
	buildRWAPerpsOverviewChartSeries,
	getRWAPerpsOverviewChartType,
	getRWAPerpsOverviewChartTypeQueryPatch,
	getRWAPerpsOverviewTimeSeriesMode,
	getRWAPerpsOverviewTimeSeriesModeQueryPatch,
	resolveRWAPerpsOverviewSelectedStacks
} from './OverviewChart'

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

	it('builds line series without point markers for non-volume metrics', () => {
		const series = buildRWAPerpsOverviewChartSeries({
			chartType: 'openInterest',
			stackOptions: ['Meta']
		})

		expect(series).toMatchObject([{ name: 'Meta', type: 'line', stack: 'A' }])
		expect(series[0]).not.toHaveProperty('showSymbol')
	})

	it('builds stacked bar series for volume charts', () => {
		expect(
			buildRWAPerpsOverviewChartSeries({
				chartType: 'volume24h',
				stackOptions: ['Meta', 'NVIDIA']
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
				stackOptions: ['Total']
			})
		).toMatchObject([{ name: 'Total', type: 'line', stack: 'A' }])
	})
})
