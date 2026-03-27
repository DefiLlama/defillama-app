import { describe, expect, it } from 'vitest'
import {
	createRwaChartModeState,
	getChartBreakdownOptions,
	getDefaultChartBreakdown,
	getTreemapNestedByOptions,
	parseRwaChartState
} from './chartState'

describe('parseRwaChartState', () => {
	it('normalizes legacy hbar query values', () => {
		const state = parseRwaChartState({ chartView: 'bar' }, createRwaChartModeState('chain', false))
		expect(state.view).toBe('hbar')
	})

	it('falls back to the chain time-series default when the query value is invalid', () => {
		const state = parseRwaChartState({ timeSeriesChartBreakdown: 'assetName' }, createRwaChartModeState('chain', false))

		expect(state).toMatchObject({
			view: 'timeSeries',
			breakdown: 'assetGroup'
		})
	})

	it('keeps a valid category time-series breakdown', () => {
		const state = parseRwaChartState(
			{ timeSeriesChartBreakdown: 'platform' },
			createRwaChartModeState('category', true)
		)

		expect(state).toMatchObject({
			view: 'timeSeries',
			breakdown: 'platform'
		})
	})

	it('uses asset group as the non-time-series default where supported', () => {
		expect(parseRwaChartState({ chartView: 'pie' }, createRwaChartModeState('chain', false)).breakdown).toBe(
			'assetGroup'
		)
		expect(parseRwaChartState({ chartView: 'pie' }, createRwaChartModeState('category', true)).breakdown).toBe(
			'assetGroup'
		)
		expect(parseRwaChartState({ chartView: 'pie' }, createRwaChartModeState('platform', true)).breakdown).toBe(
			'assetGroup'
		)
	})

	it('keeps asset name as the asset-group page non-time-series default', () => {
		const state = parseRwaChartState({ chartView: 'pie' }, createRwaChartModeState('assetGroup', true))
		expect(state.breakdown).toBe('assetName')
	})

	it('accepts asset-group treemap nesting by category', () => {
		const state = parseRwaChartState(
			{
				chartView: 'treemap',
				nonTimeSeriesChartBreakdown: 'assetGroup',
				treemapNestedBy: 'category'
			},
			createRwaChartModeState('platform', true)
		)

		expect(state).toMatchObject({
			view: 'treemap',
			breakdown: 'assetGroup',
			treemapNestedBy: 'category'
		})
	})
})

describe('chartState options', () => {
	it('matches the current time-series breakdown matrix', () => {
		expect(getDefaultChartBreakdown(createRwaChartModeState('chain', false), 'timeSeries')).toBe('assetGroup')
		expect(getDefaultChartBreakdown(createRwaChartModeState('category', true), 'timeSeries')).toBe('assetGroup')
		expect(getDefaultChartBreakdown(createRwaChartModeState('platform', true), 'timeSeries')).toBe('assetGroup')
		expect(getDefaultChartBreakdown(createRwaChartModeState('assetGroup', true), 'timeSeries')).toBe('assetName')
	})

	it('adds chain only when the mode allows it', () => {
		const withChain = getChartBreakdownOptions({
			mode: createRwaChartModeState('category', true),
			view: 'pie'
		})
		const withoutChain = getChartBreakdownOptions({
			mode: createRwaChartModeState('chain', false),
			view: 'pie'
		})

		expect(withChain.map(({ key }) => key)).toContain('chain')
		expect(withoutChain.map(({ key }) => key)).not.toContain('chain')
	})

	it('includes asset category as an asset-group treemap nested option', () => {
		expect(getTreemapNestedByOptions('assetGroup').map(({ key }) => key)).toEqual([
			'none',
			'assetClass',
			'assetName',
			'category'
		])
	})
})
