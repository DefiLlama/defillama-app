import { describe, expect, it } from 'vitest'
import { groupData } from './utils'
import { serializeChainChartToMultiChart, serializeProtocolChartToMultiChart } from './utils/chartSerializer'

describe('groupData', () => {
	it('groups data yearly', () => {
		expect(
			groupData(
				[
					['1706745600', 10], // 2024-02-01
					['1727740800', 20], // 2024-10-01
					['1735689600', 30] // 2025-01-01
				],
				'year'
			)
		).toEqual([
			['1704067200', 30],
			['1735689600', 30]
		])
	})
})

describe('chartSerializer', () => {
	it('preserves yearly grouping for protocol overview charts', () => {
		const { multiChart } = serializeProtocolChartToMultiChart({
			protocolId: 'aave',
			protocolName: 'Aave',
			toggledMetrics: ['TVL'],
			chartColors: { TVL: '#000' },
			groupBy: 'yearly'
		})

		expect(multiChart?.grouping).toBe('year')
		expect(multiChart?.items[0]?.grouping).toBe('year')
	})

	it('preserves yearly grouping for chain overview charts', () => {
		const { multiChart } = serializeChainChartToMultiChart({
			chainName: 'Ethereum',
			toggledMetrics: ['TVL'],
			chartColors: { TVL: '#000' },
			groupBy: 'yearly'
		})

		expect(multiChart?.grouping).toBe('year')
		expect(multiChart?.items[0]?.grouping).toBe('year')
	})
})
