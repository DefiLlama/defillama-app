import { describe, expect, it } from 'vitest'
import {
	createStablecoinOverviewChartMode,
	getStablecoinChartViewOptions,
	parseStablecoinChartState
} from './chartState'

describe('stablecoin chart state', () => {
	it('uses overview defaults', () => {
		expect(parseStablecoinChartState({}, createStablecoinOverviewChartMode('All'))).toMatchObject({
			type: 'marketCap',
			view: 'total'
		})
	})

	it('uses chains page defaults', () => {
		expect(parseStablecoinChartState({}, { page: 'chains' })).toMatchObject({
			type: 'marketCap',
			view: 'pie'
		})
	})

	it('uses asset page defaults', () => {
		expect(parseStablecoinChartState({}, { page: 'asset' })).toMatchObject({
			type: 'marketCap',
			view: 'pie'
		})
	})

	it('normalizes invalid views to the selected type default', () => {
		expect(
			parseStablecoinChartState(
				{ chartType: 'volume', chartView: 'dominance' },
				createStablecoinOverviewChartMode('All')
			)
		).toMatchObject({
			type: 'volume',
			view: 'total'
		})
	})

	it('allows scoped chain page volume views', () => {
		const state = parseStablecoinChartState(
			{ chartType: 'volume', chartView: 'byToken' },
			createStablecoinOverviewChartMode('Ethereum')
		)

		expect(state).toMatchObject({ type: 'volume', view: 'byToken' })
		expect(getStablecoinChartViewOptions(state)).toEqual([
			{ key: 'total', name: 'Total' },
			{ key: 'byToken', name: 'By Token' },
			{ key: 'byCurrency', name: 'By Currency' }
		])
		expect(
			parseStablecoinChartState(
				{ chartType: 'volume', chartView: 'byChain' },
				createStablecoinOverviewChartMode('Ethereum')
			)
		).toMatchObject({ type: 'volume', view: 'total' })
	})

	it('allows scoped asset page volume views', () => {
		const state = parseStablecoinChartState({ chartType: 'volume', chartView: 'byChain' }, { page: 'asset' })

		expect(state).toMatchObject({ type: 'volume', view: 'byChain' })
		expect(getStablecoinChartViewOptions(state)).toEqual([
			{ key: 'total', name: 'Total' },
			{ key: 'byChain', name: 'By Chain' }
		])
		expect(parseStablecoinChartState({ chartType: 'volume', chartView: 'byToken' }, { page: 'asset' })).toMatchObject({
			type: 'volume',
			view: 'total'
		})
	})
})
