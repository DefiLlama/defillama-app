import { describe, expect, it } from 'vitest'
import type { ChartCapabilities, ChartViewState } from '../chartCapabilities'
import { buildControlsModel, normalizeViewState } from '../chartCapabilities'

const capabilities: ChartCapabilities = {
	allowStack: true,
	allowPercentage: true,
	allowCumulative: false,
	allowGrouping: false,
	allowHallmarks: false,
	allowLabels: false,
	allowLogScale: true,
	logEligibleYAxes: [0],
	groupingOptions: []
}

const baseState: ChartViewState = {
	stacked: false,
	percentage: false,
	cumulative: false,
	grouping: 'day',
	showHallmarks: false,
	showLabels: false,
	logScale: true
}

describe('chartCapabilities', () => {
	it('hides log scale while percentage mode is active', () => {
		const state = normalizeViewState({ ...baseState, percentage: true }, capabilities)
		const controls = buildControlsModel('Chart', state, capabilities)

		expect(state.logScale).toBe(false)
		expect(controls.showLogScale).toBe(false)
	})

	it('keeps log scale available for non-percentage charts', () => {
		const state = normalizeViewState(baseState, capabilities)
		const controls = buildControlsModel('Chart', state, capabilities)

		expect(state.logScale).toBe(true)
		expect(controls.showLogScale).toBe(true)
	})
})
