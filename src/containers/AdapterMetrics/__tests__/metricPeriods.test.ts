import { describe, expect, test } from 'vitest'
import { deriveMetricChanges, mergeMetricPeriods, mergeParentMetricPeriods } from '../metricPeriods'

describe('dimension metric periods', () => {
	test('derives period changes from current and previous period totals', () => {
		const protocol = deriveMetricChanges({
			total24h: 150,
			total48hto24h: 100,
			total7d: 1000,
			total14dto7d: 800,
			total30d: 3000,
			total60dto30d: 1500,
			total7DaysAgo: 75,
			total30DaysAgo: 50
		})

		expect(protocol.change_1d).toBe(50)
		expect(protocol.change_7d).toBe(100)
		expect(protocol.change_7dover7d).toBe(25)
		expect(protocol.change_1m).toBe(200)
		expect(protocol.change_30dover30d).toBe(100)
	})

	test('returns null changes for missing previous period totals', () => {
		const protocol = deriveMetricChanges({
			total24h: 100,
			total7d: 1000,
			total14dto7d: null
		})

		expect(protocol.change_7d).toBeNull()
		expect(protocol.change_7dover7d).toBeNull()
	})

	test('merges nullable period totals before deriving changes', () => {
		const protocol = mergeMetricPeriods(
			{
				total24h: 100,
				total48hto24h: 80,
				total7d: 700,
				total14dto7d: 350,
				total30d: 3000,
				total60dto30d: 1500,
				total7DaysAgo: 75,
				total30DaysAgo: 100
			},
			{
				total24h: 50,
				total48hto24h: 20,
				total7d: 300,
				total14dto7d: 650,
				total30d: null,
				total60dto30d: 100,
				total7DaysAgo: 25,
				total30DaysAgo: 50
			}
		)

		expect(protocol.total24h).toBe(150)
		expect(protocol.total48hto24h).toBe(100)
		expect(protocol.change_1d).toBe(50)
		expect(protocol.total7d).toBe(1000)
		expect(protocol.total14dto7d).toBe(1000)
		expect(protocol.total7DaysAgo).toBe(100)
		expect(protocol.change_7d).toBe(50)
		expect(protocol.change_7dover7d).toBe(0)
		expect(protocol.total30d).toBe(3000)
		expect(protocol.total60dto30d).toBe(1600)
		expect(protocol.total30DaysAgo).toBe(150)
		expect(protocol.change_1m).toBe(0)
		expect(protocol.change_30dover30d).toBe(87.5)
	})

	test('merges parent annualized totals when every contributing child has annualized data', () => {
		const protocol = mergeParentMetricPeriods([
			{ total24h: 100, total30d: 3000, annualized1y: 20_000 },
			{ total24h: 50, total30d: 1500, annualized1y: 10_000 }
		])

		expect(protocol.total24h).toBe(150)
		expect(protocol.total30d).toBe(4500)
		expect(protocol.annualized1y).toBe(30_000)
	})

	test('keeps parent annualized null when a contributing child is missing annualized data', () => {
		const protocol = mergeParentMetricPeriods([
			{ total24h: 100, total30d: 3000, annualized1y: 20_000 },
			{ total24h: 50, total30d: 1500, annualized1y: null }
		])

		expect(protocol.total24h).toBe(150)
		expect(protocol.total30d).toBe(4500)
		expect(protocol.annualized1y).toBeNull()
	})

	test('does not poison parent annualized totals for sparse children without period totals', () => {
		const protocol = mergeParentMetricPeriods([
			{ total24h: 100, total30d: 3000, annualized1y: 20_000 },
			{ annualized1y: null }
		])

		expect(protocol.total24h).toBe(100)
		expect(protocol.total30d).toBe(3000)
		expect(protocol.annualized1y).toBe(20_000)
	})
})
