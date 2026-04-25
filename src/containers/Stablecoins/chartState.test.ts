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

	it('limits chain page volume to total', () => {
		const state = parseStablecoinChartState(
			{ chartType: 'volume', chartView: 'byToken' },
			createStablecoinOverviewChartMode('Ethereum')
		)

		expect(state).toMatchObject({ type: 'volume', view: 'total' })
		expect(getStablecoinChartViewOptions(state)).toEqual([{ key: 'total', name: 'Total' }])
	})
})
