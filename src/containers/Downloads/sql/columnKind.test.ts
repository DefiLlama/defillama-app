import { describe, expect, it } from 'vitest'
import {
	classifyColumn,
	classifyColumns,
	coarsen,
	inferFineKindFromArrowType,
	looksLikeISODate,
	looksLikeNumericArray
} from './columnKind'
import type { QueryResult } from './exportResults'

describe('inferFineKindFromArrowType', () => {
	it('classifies common Arrow types', () => {
		expect(inferFineKindFromArrowType('Int64')).toBe('int')
		expect(inferFineKindFromArrowType('Int32')).toBe('int')
		expect(inferFineKindFromArrowType('Float64')).toBe('float')
		expect(inferFineKindFromArrowType('Double')).toBe('float')
		expect(inferFineKindFromArrowType('Decimal(18,6)')).toBe('float')
		expect(inferFineKindFromArrowType('Utf8')).toBe('text')
		expect(inferFineKindFromArrowType('LargeUtf8')).toBe('text')
		expect(inferFineKindFromArrowType('Boolean')).toBe('bool')
		expect(inferFineKindFromArrowType('Date32<DAY>')).toBe('date')
		expect(inferFineKindFromArrowType('Timestamp<MILLISECOND, null>')).toBe('date')
		expect(inferFineKindFromArrowType('List<Double>')).toBe('list')
		expect(inferFineKindFromArrowType('LIST<DOUBLE>')).toBe('list')
		expect(inferFineKindFromArrowType('LargeList<Int64>')).toBe('list')
		expect(inferFineKindFromArrowType('Struct<x:Int32>')).toBe('other')
		expect(inferFineKindFromArrowType(undefined)).toBe('other')
	})
})

describe('coarsen', () => {
	it('collapses int/float to number', () => {
		expect(coarsen('int')).toBe('number')
		expect(coarsen('float')).toBe('number')
	})
	it('collapses text/bool to category', () => {
		expect(coarsen('text')).toBe('category')
		expect(coarsen('bool')).toBe('category')
	})
	it('preserves date and list/other', () => {
		expect(coarsen('date')).toBe('date')
		expect(coarsen('list')).toBe('other')
		expect(coarsen('other')).toBe('other')
	})
})

describe('looksLikeISODate', () => {
	it('matches YYYY-MM-DD and timestamps', () => {
		expect(looksLikeISODate('2024-01-17')).toBe(true)
		expect(looksLikeISODate('2024-01-17T12:34:56')).toBe(true)
		expect(looksLikeISODate('2024-01-17T12:34:56.123Z')).toBe(true)
		expect(looksLikeISODate('2024-01-17T12:34:56+00:00')).toBe(true)
	})
	it('rejects non-dates', () => {
		expect(looksLikeISODate('hello')).toBe(false)
		expect(looksLikeISODate('2024/01/17')).toBe(false)
		expect(looksLikeISODate(17)).toBe(false)
		expect(looksLikeISODate(null)).toBe(false)
	})
})

describe('looksLikeNumericArray', () => {
	it('true for numeric arrays', () => {
		expect(looksLikeNumericArray([1, 2, 3])).toBe(true)
		expect(looksLikeNumericArray([1, null, 3])).toBe(true)
		expect(looksLikeNumericArray([])).toBe(true)
	})
	it('false for non-numeric', () => {
		expect(looksLikeNumericArray([1, 'x', 3])).toBe(false)
		expect(looksLikeNumericArray('abc')).toBe(false)
		expect(looksLikeNumericArray({ a: 1 })).toBe(false)
	})
})

describe('classifyColumn', () => {
	it('promotes text column of ISO dates to date', () => {
		const rows = [{ x: '2024-01-17' }, { x: '2024-01-18' }, { x: '2024-01-19' }]
		const result = classifyColumn('Utf8', 'x', rows)
		expect(result.fine).toBe('date')
		expect(result.coarse).toBe('date')
	})
	it('keeps text column as category when any sample is not ISO', () => {
		const rows = [{ x: '2024-01-17' }, { x: 'not-a-date' }]
		const result = classifyColumn('Utf8', 'x', rows)
		expect(result.fine).toBe('text')
		expect(result.coarse).toBe('category')
	})
	it('detects numeric-array columns as list', () => {
		const rows = [{ x: [1, 2, 3] }, { x: null }]
		const result = classifyColumn('Map<String, Double>', 'x', rows)
		expect(result.fine).toBe('list')
		expect(result.coarse).toBe('other')
	})
	it('skips empty text samples', () => {
		const rows = [{ x: '' }, { x: null }]
		const result = classifyColumn('Utf8', 'x', rows)
		expect(result.fine).toBe('text')
	})
})

describe('classifyColumns', () => {
	it('classifies all columns of a result', () => {
		const result: QueryResult = {
			columns: [
				{ name: 'date', type: 'Utf8' },
				{ name: 'tvl', type: 'Float64' },
				{ name: 'chain', type: 'Utf8' }
			],
			rows: [
				{ date: '2024-01-01', tvl: 1.0, chain: 'ethereum' },
				{ date: '2024-01-02', tvl: 2.0, chain: 'arbitrum' }
			]
		}
		const classified = classifyColumns(result)
		expect(classified[0].fine).toBe('date')
		expect(classified[1].fine).toBe('float')
		expect(classified[2].fine).toBe('text')
	})
})
