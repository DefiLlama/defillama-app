import { describe, expect, it } from 'vitest'
import { pivotRowsForSplit } from './pivot'

describe('pivotRowsForSplit', () => {
	it('pivots long into wide', () => {
		const rows = [
			{ date: 1, value: 10, chain: 'eth' },
			{ date: 1, value: 5, chain: 'arb' },
			{ date: 2, value: 12, chain: 'eth' },
			{ date: 2, value: 6, chain: 'arb' }
		]
		const result = pivotRowsForSplit(rows, 'date', 'value', 'chain')
		expect(result.keys).toEqual(['eth', 'arb'])
		expect(result.rows).toHaveLength(2)
		expect(result.rows[0]).toEqual({ date: 1, eth: 10, arb: 5 })
		expect(result.rows[1]).toEqual({ date: 2, eth: 12, arb: 6 })
		expect(result.truncatedCount).toBe(0)
	})

	it('sums duplicate (x, split) pairs', () => {
		const rows = [
			{ d: 1, v: 1, s: 'a' },
			{ d: 1, v: 2, s: 'a' },
			{ d: 1, v: 3, s: 'b' }
		]
		const result = pivotRowsForSplit(rows, 'd', 'v', 's')
		expect(result.rows[0].a).toBe(3)
		expect(result.rows[0].b).toBe(3)
	})

	it('folds beyond top-N into Other', () => {
		const rows: Array<Record<string, any>> = []
		for (let i = 0; i < 25; i++) rows.push({ d: 1, v: 10 - i / 100, s: `k${i}` })
		const result = pivotRowsForSplit(rows, 'd', 'v', 's', { topN: 5 })
		expect(result.keys).toHaveLength(6) // 5 + Other
		expect(result.keys[5]).toBe('Other')
		expect(result.truncatedCount).toBe(20)
		const otherValue = result.rows[0].Other as number
		expect(otherValue).toBeGreaterThan(0)
	})

	it('handles all-in-one bucket', () => {
		const rows = [
			{ d: 1, v: 5, s: 'only' },
			{ d: 2, v: 6, s: 'only' }
		]
		const result = pivotRowsForSplit(rows, 'd', 'v', 's')
		expect(result.keys).toEqual(['only'])
		expect(result.truncatedCount).toBe(0)
	})

	it('preserves numeric X sort order', () => {
		const rows = [
			{ d: 2, v: 1, s: 'a' },
			{ d: 1, v: 2, s: 'a' },
			{ d: 3, v: 3, s: 'a' }
		]
		const result = pivotRowsForSplit(rows, 'd', 'v', 's')
		expect(result.rows.map((r) => r.d)).toEqual([1, 2, 3])
	})

	it('treats null splits as a distinct bucket', () => {
		const rows = [
			{ d: 1, v: 1, s: null },
			{ d: 1, v: 2, s: 'a' }
		]
		const result = pivotRowsForSplit(rows, 'd', 'v', 's')
		expect(result.keys).toContain('∅')
		expect(result.keys).toContain('a')
	})
})
