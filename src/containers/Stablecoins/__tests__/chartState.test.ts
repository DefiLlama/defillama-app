import { describe, expect, it } from 'vitest'
import {
	createStablecoinOverviewChartMode,
	getStablecoinAssetDashboardChartType,
	getStablecoinAssetSeriesChart,
	getStablecoinAssetVolumeChartKind,
	getStablecoinChainsSeriesChart,
	getStablecoinChainsVolumeChartKind,
	getStablecoinDashboardChartType,
	getStablecoinChartViewOptions,
	getStablecoinOverviewSeriesChart,
	getStablecoinOverviewVolumeChartKind,
	parseStablecoinVolumeGroupBy,
	parseStablecoinChartState
} from '../chartState'

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
			view: 'total'
		})
	})

	it('uses asset page defaults', () => {
		expect(parseStablecoinChartState({}, { page: 'asset' })).toMatchObject({
			type: 'marketCap',
			view: 'total'
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

	it('parses volume grouping query values once for all stablecoin pages', () => {
		expect(parseStablecoinVolumeGroupBy('weekly')).toBe('weekly')
		expect(parseStablecoinVolumeGroupBy(['monthly', 'weekly'])).toBe('monthly')
		expect(parseStablecoinVolumeGroupBy('invalid')).toBe('daily')
	})

	it('maps chart state to stablecoin dashboard chart types', () => {
		expect(getStablecoinDashboardChartType('marketCap', 'total')).toBe('totalMcap')
		expect(getStablecoinDashboardChartType('marketCap', 'breakdown')).toBe('tokenMcaps')
		expect(getStablecoinDashboardChartType('marketCap', 'dominance')).toBe('dominance')
		expect(getStablecoinDashboardChartType('marketCap', 'pie')).toBe('pie')
		expect(getStablecoinDashboardChartType('inflows', 'usd')).toBe('usdInflows')
		expect(getStablecoinDashboardChartType('inflows', 'token')).toBe('tokenInflows')
		expect(getStablecoinDashboardChartType('volume', 'total')).toBeNull()
	})

	it('maps chart state to overview series chart requests', () => {
		expect(getStablecoinOverviewSeriesChart('marketCap', 'total')).toBe('totalMcap')
		expect(getStablecoinOverviewSeriesChart('marketCap', 'breakdown')).toBe('tokenMcaps')
		expect(getStablecoinOverviewSeriesChart('marketCap', 'dominance')).toBe('dominance')
		expect(getStablecoinOverviewSeriesChart('marketCap', 'pie')).toBeNull()
		expect(getStablecoinOverviewSeriesChart('volume', 'total')).toBeNull()
		expect(getStablecoinOverviewSeriesChart('inflows', 'usd')).toBe('usdInflows')
		expect(getStablecoinOverviewSeriesChart('inflows', 'token')).toBe('tokenInflows')
	})

	it('maps chart state to chains series chart requests', () => {
		expect(getStablecoinChainsSeriesChart('marketCap', 'total')).toBe('totalMcap')
		expect(getStablecoinChainsSeriesChart('marketCap', 'breakdown')).toBe('chainMcaps')
		expect(getStablecoinChainsSeriesChart('marketCap', 'dominance')).toBe('dominance')
		expect(getStablecoinChainsSeriesChart('marketCap', 'pie')).toBeNull()
		expect(getStablecoinChainsSeriesChart('volume', 'total')).toBeNull()
	})

	it('maps chart state to asset dashboard and series chart requests', () => {
		expect(getStablecoinAssetDashboardChartType('total')).toBe('totalCirc')
		expect(getStablecoinAssetDashboardChartType('breakdown')).toBe('chainMcaps')
		expect(getStablecoinAssetDashboardChartType('dominance')).toBe('chainDominance')
		expect(getStablecoinAssetDashboardChartType('pie')).toBe('chainPie')

		expect(getStablecoinAssetSeriesChart('marketCap', 'total')).toBe('totalCirc')
		expect(getStablecoinAssetSeriesChart('marketCap', 'breakdown')).toBe('chainMcaps')
		expect(getStablecoinAssetSeriesChart('marketCap', 'dominance')).toBe('chainDominance')
		expect(getStablecoinAssetSeriesChart('marketCap', 'pie')).toBeNull()
		expect(getStablecoinAssetSeriesChart('volume', 'total')).toBeNull()
	})

	it('maps chart state to scoped volume chart requests', () => {
		expect(getStablecoinOverviewVolumeChartKind('volume', 'byChain', 'All')).toBe('chain')
		expect(getStablecoinOverviewVolumeChartKind('volume', 'byChain', 'Ethereum')).toBe('total')
		expect(getStablecoinOverviewVolumeChartKind('volume', 'byToken', 'Ethereum')).toBe('token')
		expect(getStablecoinOverviewVolumeChartKind('volume', 'byCurrency', 'Ethereum')).toBe('currency')
		expect(getStablecoinOverviewVolumeChartKind('marketCap', 'total', 'All')).toBeNull()

		expect(getStablecoinChainsVolumeChartKind('volume', 'byChain')).toBe('chain')
		expect(getStablecoinChainsVolumeChartKind('volume', 'byToken')).toBe('token')
		expect(getStablecoinChainsVolumeChartKind('marketCap', 'total')).toBeNull()

		expect(getStablecoinAssetVolumeChartKind('volume', 'byChain')).toBe('chain')
		expect(getStablecoinAssetVolumeChartKind('volume', 'byToken')).toBe('total')
		expect(getStablecoinAssetVolumeChartKind('marketCap', 'total')).toBeNull()
	})
})
