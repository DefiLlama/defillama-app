import { describe, expect, it } from 'vitest'
import {
	ensureChronologicalRows,
	formatBarChart,
	formatLineChart,
	getBucketTimestampMs,
	getBucketTimestampSec,
	mergeDeep,
	prepareChartCsv,
	preparePieChartData
} from './utils'

const toSec = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day) / 1000
const toMs = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day)

// Pre-computed weekly bucket timestamps (lastDayOfWeek = next Sunday)
// Jan 15 2024 is Monday → bucket = Jan 21 (Sunday)
// Jan 22 2024 is Monday → bucket = Jan 28 (Sunday)
const weekBucketJan21 = toMs(2024, 1, 21)
const weekBucketJan28 = toMs(2024, 1, 28)

describe('formatBarChart', () => {
	it('exports canonical bucket helpers for week/month/quarter/year', () => {
		expect(getBucketTimestampSec(toSec(2024, 1, 17) + 13 * 60 * 60, 'daily')).toBe(toSec(2024, 1, 17))
		expect(getBucketTimestampSec(toSec(2024, 1, 17), 'weekly')).toBe(toSec(2024, 1, 21))
		expect(getBucketTimestampSec(toSec(2024, 3, 17), 'monthly')).toBe(toSec(2024, 3, 1))
		expect(getBucketTimestampSec(toSec(2024, 3, 17), 'quarterly')).toBe(toSec(2024, 1, 1))
		expect(getBucketTimestampSec(toSec(2024, 9, 17), 'yearly')).toBe(toSec(2024, 1, 1))
		expect(getBucketTimestampMs(toMs(2024, 3, 17), 'quarterly')).toBe(toMs(2024, 1, 1))
	})

	it('returns empty array for empty input', () => {
		expect(formatBarChart({ data: [], groupBy: 'daily', denominationPriceHistory: null })).toEqual([])
	})

	it('preserves hourly timestamps in daily mode and converts sec → ms', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 1) + 13 * 60 * 60, 10],
					[toSec(2024, 1, 2), 20]
				],
				groupBy: 'daily',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1) + 13 * 60 * 60 * 1e3, 10],
			[toMs(2024, 1, 2), 20]
		])
	})

	it('keeps same-day hourly points distinct in daily mode (regression: no midnight snapping)', () => {
		const h6 = toSec(2024, 1, 1) + 6 * 3600
		const h18 = toSec(2024, 1, 1) + 18 * 3600
		const result = formatBarChart({
			data: [
				[h6, 10],
				[h18, 20]
			],
			groupBy: 'daily',
			denominationPriceHistory: null
		})
		expect(result).toHaveLength(2)
		expect(result[0][0]).not.toBe(result[1][0])
		expect(result).toEqual([
			[h6 * 1e3, 10],
			[h18 * 1e3, 20]
		])
	})

	it('sums values into weekly buckets (lastDayOfWeek)', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 15), 10], // Mon → Sun Jan 21
					[toSec(2024, 1, 17), 5], // Wed → Sun Jan 21
					[toSec(2024, 1, 22), 30] // Mon → Sun Jan 28
				],
				groupBy: 'weekly',
				denominationPriceHistory: null
			})
		).toEqual([
			[weekBucketJan21, 15],
			[weekBucketJan28, 30]
		])
	})

	it('sums values into monthly buckets', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 3, 10), 10],
					[toSec(2024, 3, 25), 20],
					[toSec(2024, 4, 5), 30]
				],
				groupBy: 'monthly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 3, 1), 30],
			[toMs(2024, 4, 1), 30]
		])
	})

	it('sums values into quarterly buckets', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 3, 20), 20],
					[toSec(2024, 4, 5), 30]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 30],
			[toMs(2024, 4, 1), 30]
		])
	})

	it('sums values into yearly buckets', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 2, 1), 10],
					[toSec(2024, 10, 1), 20],
					[toSec(2025, 1, 1), 30]
				],
				groupBy: 'yearly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 30],
			[toMs(2025, 1, 1), 30]
		])
	})

	it('computes running total for cumulative mode', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 1), 10],
					[toSec(2024, 1, 2), 5],
					[toSec(2024, 1, 3), 15]
				],
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 10],
			[toMs(2024, 1, 2), 15],
			[toMs(2024, 1, 3), 30]
		])
	})

	it('supports millisecond input timestamps', () => {
		expect(
			formatBarChart({
				data: [
					[toMs(2024, 1, 15), 10],
					[toMs(2024, 2, 15), 20]
				],
				groupBy: 'quarterly',
				dateInMs: true,
				denominationPriceHistory: null
			})
		).toEqual([[toMs(2024, 1, 1), 30]])
	})

	it('sorts grouped output chronologically even when input is unsorted', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 4, 5), 30],
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 3, 20), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 30],
			[toMs(2024, 4, 1), 30]
		])
	})

	it('accepts string dates', () => {
		expect(
			formatBarChart({
				data: [
					[String(toSec(2024, 1, 15)), 10],
					[String(toSec(2024, 2, 15)), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: null
			})
		).toEqual([[toMs(2024, 1, 1), 30]])
	})

	it('converts denominated values before grouped sums', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 2, 15), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: {
					[String(toSec(2024, 1, 15))]: 2,
					[String(toSec(2024, 2, 15))]: 4
				}
			})
		).toEqual([[toMs(2024, 1, 1), 10]]) // 10/2 + 20/4 = 5 + 5
	})

	it('skips entries with no matching denomination price (sum mode)', () => {
		expect(
			formatBarChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 2, 15), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: {
					[String(toSec(2024, 1, 15))]: 2
					// no price for Feb 15 → entry is skipped
				}
			})
		).toEqual([[toMs(2024, 1, 1), 5]]) // only 10/2
	})

	it('applies denomination in daily mode', () => {
		expect(
			formatBarChart({
				data: [[toSec(2024, 1, 1), 100]],
				groupBy: 'daily',
				denominationPriceHistory: { [String(toSec(2024, 1, 1))]: 5 }
			})
		).toEqual([[toMs(2024, 1, 1), 20]]) // 100/5
	})

	it('returns null for daily entry with no matching denomination price', () => {
		expect(
			formatBarChart({
				data: [[toSec(2024, 1, 1), 100]],
				groupBy: 'daily',
				denominationPriceHistory: { '99999': 5 }
			})
		).toEqual([[toMs(2024, 1, 1), null]])
	})
})

describe('formatLineChart', () => {
	it('preserves hourly timestamps in daily mode', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 1) + 13 * 60 * 60, 10],
					[toSec(2024, 1, 2), 20]
				],
				groupBy: 'daily',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1) + 13 * 60 * 60 * 1e3, 10],
			[toMs(2024, 1, 2), 20]
		])
	})

	it('keeps same-day hourly points distinct in daily mode (regression: no midnight snapping)', () => {
		const h6 = toSec(2024, 1, 1) + 6 * 3600
		const h18 = toSec(2024, 1, 1) + 18 * 3600
		const result = formatLineChart({
			data: [
				[h6, 10],
				[h18, 20]
			],
			groupBy: 'daily',
			denominationPriceHistory: null
		})
		expect(result).toHaveLength(2)
		expect(result[0][0]).not.toBe(result[1][0])
		expect(result).toEqual([
			[h6 * 1e3, 10],
			[h18 * 1e3, 20]
		])
	})

	it('keeps the last value in weekly buckets', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 15), 10], // Mon → Sun Jan 21
					[toSec(2024, 1, 17), 25], // Wed → Sun Jan 21 (overwrites 10)
					[toSec(2024, 1, 22), 30] // Mon → Sun Jan 28
				],
				groupBy: 'weekly',
				denominationPriceHistory: null
			})
		).toEqual([
			[weekBucketJan21, 25],
			[weekBucketJan28, 30]
		])
	})

	it('keeps the last value in monthly buckets', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 3, 1), 10],
					[toSec(2024, 3, 15), 20],
					[toSec(2024, 3, 31), 30]
				],
				groupBy: 'monthly',
				denominationPriceHistory: null
			})
		).toEqual([[toMs(2024, 3, 1), 30]])
	})

	it('keeps the last value in quarterly buckets', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 3, 20), 20],
					[toSec(2024, 4, 5), 30]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 20],
			[toMs(2024, 4, 1), 30]
		])
	})

	it('keeps the last value in yearly buckets', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 2, 1), 10],
					[toSec(2024, 10, 1), 20],
					[toSec(2025, 1, 1), 30]
				],
				groupBy: 'yearly',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 20],
			[toMs(2025, 1, 1), 30]
		])
	})

	it('passes through daily for cumulative mode (no aggregation)', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 1), 10],
					[toSec(2024, 1, 2), 20],
					[toSec(2024, 1, 3), 30]
				],
				groupBy: 'cumulative',
				denominationPriceHistory: null
			})
		).toEqual([
			[toMs(2024, 1, 1), 10],
			[toMs(2024, 1, 2), 20],
			[toMs(2024, 1, 3), 30]
		])
	})

	it('supports millisecond input timestamps', () => {
		expect(
			formatLineChart({
				data: [
					[toMs(2024, 1, 15), 10],
					[toMs(2024, 3, 20), 20]
				],
				groupBy: 'quarterly',
				dateInMs: true,
				denominationPriceHistory: null
			})
		).toEqual([[toMs(2024, 1, 1), 20]])
	})

	it('converts denominated values (last wins per bucket)', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 2, 15), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: {
					[String(toSec(2024, 1, 15))]: 2,
					[String(toSec(2024, 2, 15))]: 4
				}
			})
		).toEqual([[toMs(2024, 1, 1), 5]]) // last entry: 20/4
	})

	it('emits null when denomination price is missing (last mode)', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 15), 10],
					[toSec(2024, 2, 15), 20]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: {
					[String(toSec(2024, 1, 15))]: 2
					// no price for Feb 15 → null overwrites the converted value
				}
			})
		).toEqual([[toMs(2024, 1, 1), null]])
	})

	it('last-wins with 3+ values in a single bucket', () => {
		expect(
			formatLineChart({
				data: [
					[toSec(2024, 1, 5), 100],
					[toSec(2024, 1, 15), 200],
					[toSec(2024, 2, 10), 300],
					[toSec(2024, 3, 20), 400]
				],
				groupBy: 'quarterly',
				denominationPriceHistory: null
			})
		).toEqual([[toMs(2024, 1, 1), 400]])
	})
})

describe('prepareChartCsv', () => {
	it('merges multiple series into timestamped rows', () => {
		const result = prepareChartCsv(
			{
				TVL: [
					[toMs(2024, 1, 1), 100],
					[toMs(2024, 1, 2), 200]
				],
				Volume: [
					[toMs(2024, 1, 1), 50],
					[toMs(2024, 1, 2), 75]
				]
			},
			'test.csv'
		)

		expect(result.filename).toBe('test.csv')
		expect(result.rows[0]).toEqual(['Timestamp', 'Date', 'TVL', 'Volume'])
		expect(result.rows).toHaveLength(3) // header + 2 data rows
	})

	it('fills missing values with empty string', () => {
		const result = prepareChartCsv(
			{
				A: [[toMs(2024, 1, 1), 10]],
				B: [[toMs(2024, 1, 2), 20]]
			},
			'sparse.csv'
		)

		const dataRows = result.rows.slice(1)
		// timestamps become string object keys in dateStore
		const row1 = dataRows.find((r) => String(r[0]) === String(toMs(2024, 1, 1)))
		const row2 = dataRows.find((r) => String(r[0]) === String(toMs(2024, 1, 2)))

		expect(row1).toBeDefined()
		expect(row1![2]).toBe(10) // A column
		expect(row1![3]).toBe('') // B column missing
		expect(row2).toBeDefined()
		expect(row2![2]).toBe('') // A column missing
		expect(row2![3]).toBe(20) // B column
	})

	it('sorts rows chronologically', () => {
		const result = prepareChartCsv(
			{
				A: [
					[toMs(2024, 1, 3), 30],
					[toMs(2024, 1, 1), 10]
				]
			},
			'sorted.csv'
		)

		const timestamps = result.rows.slice(1).map((r) => Number(r[0]))
		expect(timestamps).toEqual([toMs(2024, 1, 1), toMs(2024, 1, 3)])
	})
})

describe('ensureChronologicalRows', () => {
	it('returns the same array when already sorted', () => {
		const rows = [{ timestamp: 1 }, { timestamp: 2 }, { timestamp: 3 }]
		const result = ensureChronologicalRows(rows)
		expect(result).toBe(rows) // same reference
	})

	it('sorts out-of-order rows', () => {
		const rows = [{ timestamp: 3 }, { timestamp: 1 }, { timestamp: 2 }]
		const result = ensureChronologicalRows(rows)
		expect(result).toEqual([{ timestamp: 1 }, { timestamp: 2 }, { timestamp: 3 }])
		expect(result).not.toBe(rows) // new array
	})

	it('handles string timestamps', () => {
		const rows = [{ timestamp: '200' }, { timestamp: '100' }, { timestamp: '300' }]
		const result = ensureChronologicalRows(rows)
		expect(result).toEqual([{ timestamp: '100' }, { timestamp: '200' }, { timestamp: '300' }])
	})

	it('returns input for 0 or 1 element arrays', () => {
		expect(ensureChronologicalRows([])).toEqual([])
		const single = [{ timestamp: 42 }]
		expect(ensureChronologicalRows(single)).toBe(single)
	})

	it('sorts when a non-finite timestamp is encountered', () => {
		const rows = [{ timestamp: 1 }, { timestamp: undefined }, { timestamp: 3 }]
		const result = ensureChronologicalRows(rows)
		expect(result).not.toBe(rows)
	})
})

describe('preparePieChartData', () => {
	it('converts a Record into sorted { name, value } array', () => {
		expect(
			preparePieChartData({
				data: { Ethereum: 100, Solana: 300, Arbitrum: 200 }
			})
		).toEqual([
			{ name: 'Solana', value: 300 },
			{ name: 'Arbitrum', value: 200 },
			{ name: 'Ethereum', value: 100 }
		])
	})

	it('converts an array of records using custom identifiers', () => {
		expect(
			preparePieChartData({
				data: [
					{ chain: 'Ethereum', tvl: 100 },
					{ chain: 'Solana', tvl: 50 }
				],
				sliceIdentifier: 'chain',
				sliceValue: 'tvl'
			})
		).toEqual([
			{ name: 'Ethereum', value: 100 },
			{ name: 'Solana', value: 50 }
		])
	})

	it('limits slices and merges remainder into Others', () => {
		expect(
			preparePieChartData({
				data: { A: 100, B: 50, C: 30, D: 20, E: 10 },
				limit: 3
			})
		).toEqual([
			{ name: 'A', value: 100 },
			{ name: 'B', value: 50 },
			{ name: 'C', value: 30 },
			{ name: 'Others', value: 30 } // 20 + 10
		])
	})

	it('consolidates existing Others entry in top slices with overflow', () => {
		expect(
			preparePieChartData({
				data: { A: 100, Others: 80, C: 30, D: 20 },
				limit: 2
			})
		).toEqual([
			{ name: 'A', value: 100 },
			{ name: 'Others', value: 130 } // existing 80 + C(30) + D(20)
		])
	})

	it('returns all slices when limit is not specified', () => {
		const result = preparePieChartData({ data: { A: 1, B: 2, C: 3 } })
		expect(result).toHaveLength(3)
	})

	it('omits Others when overflow sum is 0', () => {
		const result = preparePieChartData({ data: { A: 100, B: 50 }, limit: 2 })
		expect(result).toEqual([
			{ name: 'A', value: 100 },
			{ name: 'B', value: 50 }
		])
	})
})

describe('mergeDeep', () => {
	it('merges flat objects', () => {
		expect(mergeDeep({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
	})

	it('overwrites primitive values', () => {
		expect(mergeDeep({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
	})

	it('recursively merges nested objects', () => {
		expect(mergeDeep({ a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } })
	})

	it('concatenates top-level arrays', () => {
		expect(mergeDeep([1, 2], [3, 4])).toEqual([1, 2, 3, 4])
	})

	it('overwrites nested arrays (no deep concat)', () => {
		expect(mergeDeep({ a: [1, 2] }, { a: [3, 4] })).toEqual({ a: [3, 4] })
	})

	it('returns target when source is null or undefined', () => {
		expect(mergeDeep({ a: 1 }, null)).toEqual({ a: 1 })
		expect(mergeDeep({ a: 1 }, undefined)).toEqual({ a: 1 })
	})

	it('overwrites with primitive source', () => {
		expect(mergeDeep({ a: 1 }, 42)).toBe(42)
	})

	it('handles deeply nested merge', () => {
		expect(mergeDeep({ a: { b: { c: 1 } } }, { a: { b: { d: 2 } } })).toEqual({
			a: { b: { c: 1, d: 2 } }
		})
	})
})
