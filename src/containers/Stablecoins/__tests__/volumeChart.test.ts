import { describe, expect, it } from 'vitest'
import { buildStablecoinVolumeChartPayload, groupStablecoinVolumeChartPayload } from '../volumeChart'

describe('buildStablecoinVolumeChartPayload', () => {
	it('formats total volume as a single MultiSeriesChart2 bar', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, 100],
				[1609545600, 125]
			],
			{ chart: 'total' }
		)

		expect(payload.dataset).toEqual({
			source: [
				{ timestamp: 1609459200000, Volume: 100 },
				{ timestamp: 1609545600000, Volume: 125 }
			],
			dimensions: ['timestamp', 'Volume']
		})
		expect(payload.charts).toHaveLength(1)
		expect(payload.charts[0].type).toBe('bar')
		expect(payload.stacked).toBe(false)
	})

	it('limits breakdown series and folds the rest into Others', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, { ethereum: 100, tron: 80, base: 50, bsc: 25 }],
				[1609545600, { ethereum: 120, tron: 90, base: 60, bsc: 30 }]
			],
			{ chart: 'chain', limit: 2 }
		)

		expect(payload.dataset.dimensions).toEqual(['timestamp', 'ethereum', 'tron', 'Others'])
		expect(payload.dataset.source[1]).toEqual({
			timestamp: 1609545600000,
			ethereum: 120,
			tron: 90,
			Others: 90
		})
		expect(payload.showTotalInTooltip).toBe(true)
		expect(payload.stacked).toBe(true)
	})

	it('returns one compact chain series when a selected dimension is requested', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, { bsc: 25, ethereum: 100 }],
				[1609545600, { bsc: 30, ethereum: 120 }]
			],
			{ chart: 'chain', selectedDimension: 'bsc' }
		)

		expect(payload.dataset).toEqual({
			source: [
				{ timestamp: 1609459200000, Volume: 25 },
				{ timestamp: 1609545600000, Volume: 30 }
			],
			dimensions: ['timestamp', 'Volume']
		})
		expect(payload.showTotalInTooltip).toBe(false)
		expect(payload.stacked).toBe(false)
	})

	it('uses a fallback dimension before returning an empty selected-dimension payload', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, { USDC: 25, USDT: 100 }],
				[1609545600, { USDC: 30, USDT: 120 }]
			],
			{ chart: 'token', selectedDimension: 'USD Coin', fallbackDimension: 'USDC' }
		)

		expect(payload.dataset.source).toEqual([
			{ timestamp: 1609459200000, Volume: 25 },
			{ timestamp: 1609545600000, Volume: 30 }
		])
	})

	it('does not fall back to global top series when a selected dimension is missing', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, { USDC: 25, USDT: 100 }],
				[1609545600, { USDC: 30, USDT: 120 }]
			],
			{ chart: 'token', selectedDimension: 'missing' }
		)

		expect(payload.dataset.source).toEqual([])
		expect(payload.charts).toEqual([])
	})

	it('groups volume payloads by the selected interval', () => {
		const payload = buildStablecoinVolumeChartPayload(
			[
				[1609459200, 100],
				[1609545600, 125]
			],
			{ chart: 'total' }
		)

		const grouped = groupStablecoinVolumeChartPayload(payload, 'yearly')

		expect(grouped.dataset.source).toEqual([{ timestamp: 1609459200000, Volume: 225 }])
		expect(grouped.charts[0].type).toBe('bar')
	})
})
