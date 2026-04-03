import { describe, expect, it } from 'vitest'
import {
	getDefaultRWAPerpsChartBreakdown,
	getRWAPerpsChartBreakdownOptions,
	getRWAPerpsChartMetricOptions,
	getRWAPerpsTreemapNestedByOptions,
	parseRWAPerpsChartState,
	setRWAPerpsChartView
} from './chartState'

describe('parseRWAPerpsChartState', () => {
	it('normalizes legacy hbar query values', () => {
		const state = parseRWAPerpsChartState({ chartView: 'bar' }, 'overview')
		expect(state.view).toBe('hbar')
	})

	it('defaults overview treemap to base asset nested by contracts', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'overview')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'baseAsset',
			treemapNestedBy: 'contract'
		})
	})

	it('defaults venue treemap to base asset nested by contracts', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'venue')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'baseAsset',
			treemapNestedBy: 'contract'
		})
	})

	it('accepts a valid perps treemap nested grouping', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'assetClass',
				treemapNestedBy: 'baseAsset'
			},
			'overview'
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetClass',
			treemapNestedBy: 'baseAsset'
		})
	})

	it('falls back safely when treemapNestedBy is invalid for the selected parent group', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'baseAsset',
				treemapNestedBy: 'assetClass'
			},
			'venue'
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'baseAsset',
			treemapNestedBy: 'contract'
		})
	})
})

describe('perps chartState options', () => {
	it('uses the expected defaults for each page/view', () => {
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'timeSeries')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'pie')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'treemap')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'timeSeries')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'treemap')).toBe('baseAsset')
	})

	it('exposes chart metric options with key/name pairs', () => {
		expect(getRWAPerpsChartMetricOptions()).toEqual([
			{ key: 'openInterest', name: 'Open Interest' },
			{ key: 'volume24h', name: 'Volume' },
			{ key: 'markets', name: 'Markets' }
		])
	})

	it('exposes the intended overview grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'timeSeries'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'pie'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'treemap'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])
	})

	it('exposes the intended venue grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'timeSeries'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'contract', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'pie'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'contract', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'treemap'
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'assetClass', 'contract'])
	})

	it('returns nested-group options keyed by treemap parent group', () => {
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'venue').map(({ key }) => key)).toEqual([
			'none',
			'assetClass',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'assetClass').map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'baseAsset').map(({ key }) => key)).toEqual([
			'none',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'contract').map(({ key }) => key)).toEqual(['none'])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'assetClass').map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'baseAsset').map(({ key }) => key)).toEqual(['none', 'contract'])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'contract').map(({ key }) => key)).toEqual(['none'])
	})

	it('resets breakdown correctly when switching into treemap view', () => {
		const nextState = setRWAPerpsChartView(
			{
				mode: 'overview',
				view: 'pie',
				metric: 'openInterest',
				breakdown: 'assetClass',
				treemapNestedBy: 'baseAsset'
			},
			'treemap'
		)

		expect(nextState).toMatchObject({
			view: 'treemap',
			breakdown: 'assetClass',
			treemapNestedBy: 'baseAsset'
		})
	})
})
