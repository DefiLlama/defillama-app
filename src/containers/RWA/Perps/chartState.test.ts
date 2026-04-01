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

	it('defaults overview treemap to venue nested by asset class', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'overview')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'venue',
			treemapNestedBy: 'assetClass'
		})
	})

	it('defaults venue treemap to asset class nested by reference asset', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'venue')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetClass',
			treemapNestedBy: 'referenceAsset'
		})
	})

	it('accepts a valid perps treemap nested grouping', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'assetClass',
				treemapNestedBy: 'referenceAsset'
			},
			'overview'
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetClass',
			treemapNestedBy: 'referenceAsset'
		})
	})

	it('falls back safely when treemapNestedBy is invalid for the selected parent group', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'referenceAsset',
				treemapNestedBy: 'assetClass'
			},
			'venue'
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'referenceAsset',
			treemapNestedBy: 'coin'
		})
	})
})

describe('perps chartState options', () => {
	it('uses the expected defaults for each page/view', () => {
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'timeSeries')).toBe('venue')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'pie')).toBe('venue')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'treemap')).toBe('venue')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'timeSeries')).toBe('referenceAsset')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'treemap')).toBe('assetClass')
	})

	it('exposes chart metric options with key/name pairs', () => {
		expect(getRWAPerpsChartMetricOptions()).toEqual([
			{ key: 'openInterest', name: 'Open Interest' },
			{ key: 'volume24h', name: '24h Volume' },
			{ key: 'markets', name: 'Markets' }
		])
	})

	it('exposes the intended overview grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'timeSeries'
			}).map(({ key }) => key)
		).toEqual(['venue', 'assetClass', 'referenceAsset', 'coin'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'pie'
			}).map(({ key }) => key)
		).toEqual(['venue', 'assetClass', 'referenceAsset', 'coin'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'treemap'
			}).map(({ key }) => key)
		).toEqual(['venue', 'assetClass', 'referenceAsset', 'coin'])
	})

	it('exposes the intended venue grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'timeSeries'
			}).map(({ key }) => key)
		).toEqual(['referenceAsset', 'coin', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'pie'
			}).map(({ key }) => key)
		).toEqual(['referenceAsset', 'coin', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'treemap'
			}).map(({ key }) => key)
		).toEqual(['assetClass', 'referenceAsset', 'coin'])
	})

	it('returns nested-group options keyed by treemap parent group', () => {
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'venue').map(({ key }) => key)).toEqual([
			'none',
			'assetClass',
			'referenceAsset',
			'coin'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'assetClass').map(({ key }) => key)).toEqual([
			'none',
			'referenceAsset',
			'coin'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'referenceAsset').map(({ key }) => key)).toEqual([
			'none',
			'coin'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'coin').map(({ key }) => key)).toEqual(['none'])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'assetClass').map(({ key }) => key)).toEqual([
			'none',
			'referenceAsset',
			'coin'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'referenceAsset').map(({ key }) => key)).toEqual(['none', 'coin'])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'coin').map(({ key }) => key)).toEqual(['none'])
	})

	it('resets breakdown correctly when switching into treemap view', () => {
		const nextState = setRWAPerpsChartView(
			{
				mode: 'overview',
				view: 'pie',
				metric: 'openInterest',
				breakdown: 'assetClass',
				treemapNestedBy: 'referenceAsset'
			},
			'treemap'
		)

		expect(nextState).toMatchObject({
			view: 'treemap',
			breakdown: 'assetClass',
			treemapNestedBy: 'referenceAsset'
		})
	})
})
