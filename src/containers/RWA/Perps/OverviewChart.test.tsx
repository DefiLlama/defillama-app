import { describe, expect, it } from 'vitest'
import {
	getRWAPerpsOverviewChartType,
	getRWAPerpsOverviewChartTypeQueryPatch,
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
})
