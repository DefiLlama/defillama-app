import { describe, expect, it } from 'vitest'
import {
	DEFAULT_CHART_VIEW,
	getDefaultRWAPerpsChartView,
	getDefaultRWAPerpsChartBreakdown,
	getRWAPerpsChartBreakdownOptions,
	getRWAPerpsChartMetricOptions,
	getRWAPerpsTimeSeriesModeOptions,
	getRWAPerpsTimeSeriesModeQueryValue,
	getRWAPerpsTreemapNestedByOptions,
	parseRWAPerpsChartState,
	setRWAPerpsChartView
} from './chartState'

const chartLabels = {
	openInterest: { label: 'Open Interest' },
	markets: { label: 'Markets' },
	venue: { label: 'Venue' },
	assetClass: { label: 'Asset Class' },
	baseAsset: { label: 'Base Asset' },
	assetGroup: { label: 'Asset Group' },
	contract: { label: 'Contract' }
} as const

describe('parseRWAPerpsChartState', () => {
	it('normalizes legacy hbar query values', () => {
		const state = parseRWAPerpsChartState({ chartView: 'bar' }, 'overview')
		expect(state.view).toBe('hbar')
	})

	it('defaults all pages to time series when no chart view is provided', () => {
		const overviewState = parseRWAPerpsChartState({}, 'overview')
		const venueState = parseRWAPerpsChartState({}, 'venue')
		const assetGroupState = parseRWAPerpsChartState({}, 'assetGroup')

		expect(overviewState).toMatchObject({
			view: 'timeSeries',
			breakdown: 'assetGroup',
			timeSeriesMode: 'grouped',
			treemapNestedBy: 'baseAsset'
		})
		expect(venueState).toMatchObject({
			view: 'timeSeries',
			breakdown: 'assetGroup',
			timeSeriesMode: 'grouped',
			treemapNestedBy: 'baseAsset'
		})
		expect(assetGroupState).toMatchObject({
			view: 'timeSeries',
			breakdown: 'baseAsset',
			timeSeriesMode: 'grouped',
			treemapNestedBy: 'contract'
		})
	})

	it('defaults overview treemap to asset group nested by base asset', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'overview')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetGroup',
			treemapNestedBy: 'baseAsset'
		})
	})

	it('defaults venue treemap to asset group nested by base asset', () => {
		const state = parseRWAPerpsChartState({ chartView: 'treemap' }, 'venue')

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetGroup',
			treemapNestedBy: 'baseAsset'
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

	it('parses a valid time-series mode query', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'timeSeries',
				timeSeriesMode: 'breakdown'
			},
			'overview'
		)

		expect(state.timeSeriesMode).toBe('breakdown')
	})
})

describe('perps chartState options', () => {
	it('uses time series as the shared default chart view', () => {
		expect(DEFAULT_CHART_VIEW).toBe('timeSeries')
	})

	it('uses time series as the default chart view for every perps page', () => {
		expect(getDefaultRWAPerpsChartView('overview')).toBe('timeSeries')
		expect(getDefaultRWAPerpsChartView('venue')).toBe('timeSeries')
		expect(getDefaultRWAPerpsChartView('assetGroup')).toBe('timeSeries')
	})

	it('uses the expected defaults for each page/view', () => {
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'timeSeries')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'pie')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('overview', 'treemap')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'timeSeries')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'pie')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('venue', 'treemap')).toBe('assetGroup')
		expect(getDefaultRWAPerpsChartBreakdown('assetGroup', 'timeSeries')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('assetGroup', 'pie')).toBe('baseAsset')
		expect(getDefaultRWAPerpsChartBreakdown('assetGroup', 'treemap')).toBe('baseAsset')
	})

	it('exposes chart metric options with key/name pairs', () => {
		expect(getRWAPerpsChartMetricOptions(chartLabels)).toEqual([
			{ key: 'openInterest', name: 'Open Interest' },
			{ key: 'volume24h', name: 'Volume' },
			{ key: 'markets', name: 'Markets' }
		])
	})

	it('exposes grouped and breakdown time-series mode options', () => {
		expect(getRWAPerpsTimeSeriesModeOptions()).toEqual([
			{ key: 'grouped', name: 'Grouped' },
			{ key: 'breakdown', name: 'Breakdown' }
		])
	})

	it('omits the default grouped time-series mode from the query', () => {
		expect(getRWAPerpsTimeSeriesModeQueryValue('grouped')).toBeUndefined()
		expect(getRWAPerpsTimeSeriesModeQueryValue('breakdown')).toBe('breakdown')
	})

	it('exposes the intended overview grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'timeSeries',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'pie',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'overview',
				view: 'treemap',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'venue', 'assetClass', 'contract'])
	})

	it('exposes the intended venue grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'timeSeries',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'contract', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'pie',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'contract', 'assetClass'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'venue',
				view: 'treemap',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['assetGroup', 'baseAsset', 'assetClass', 'contract'])
	})

	it('exposes the intended asset-group grouping matrix', () => {
		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'assetGroup',
				view: 'timeSeries',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'assetGroup',
				view: 'pie',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])

		expect(
			getRWAPerpsChartBreakdownOptions({
				mode: 'assetGroup',
				view: 'treemap',
				labels: chartLabels
			}).map(({ key }) => key)
		).toEqual(['baseAsset', 'venue', 'assetClass', 'contract'])
	})

	it('returns nested-group options keyed by treemap parent group', () => {
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'venue', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'assetClass',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'assetGroup', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'assetClass',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'assetClass', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'baseAsset', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('overview', 'contract', chartLabels).map(({ key }) => key)).toEqual([
			'none'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'assetClass', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'assetGroup', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'assetClass',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'baseAsset', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('venue', 'contract', chartLabels).map(({ key }) => key)).toEqual(['none'])
		expect(getRWAPerpsTreemapNestedByOptions('assetGroup', 'venue', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'baseAsset',
			'assetClass',
			'contract'
		])
		expect(getRWAPerpsTreemapNestedByOptions('assetGroup', 'baseAsset', chartLabels).map(({ key }) => key)).toEqual([
			'none',
			'contract'
		])
	})

	it('defaults asset-group treemaps to nested base assets', () => {
		const state = parseRWAPerpsChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'assetGroup'
			},
			'overview'
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetGroup',
			treemapNestedBy: 'baseAsset'
		})
	})

	it('resets breakdown correctly when switching into treemap view', () => {
		const nextState = setRWAPerpsChartView(
			{
				mode: 'overview',
				view: 'pie',
				metric: 'openInterest',
				breakdown: 'assetClass',
				timeSeriesMode: 'grouped',
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
