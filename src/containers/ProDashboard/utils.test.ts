import { describe, expect, it } from 'vitest'
import { getGroupedTimestampSec, groupData } from './utils'
import { serializeChainChartToMultiChart, serializeProtocolChartToMultiChart } from './utils/chartSerializer'

describe('getGroupedTimestampSec', () => {
	it('uses the shared bucket helper while preserving week start in UTC seconds', () => {
		expect(getGroupedTimestampSec(1705449600, 'week')).toBe(1705276800) // 2024-01-17 -> 2024-01-15
		expect(getGroupedTimestampSec(1710460800, 'month')).toBe(1709251200) // 2024-03-15 -> 2024-03-01
		expect(getGroupedTimestampSec(1710460800, 'quarter')).toBe(1704067200) // 2024-03-15 -> 2024-01-01
		expect(getGroupedTimestampSec(1729296000, 'year')).toBe(1704067200) // 2024-10-19 -> 2024-01-01
	})
})

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
