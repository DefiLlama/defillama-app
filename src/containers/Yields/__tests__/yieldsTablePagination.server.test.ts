import { describe, expect, it } from 'vitest'
import { paginateAndSortRows } from '../yieldsTablePagination.server'
import { MAX_YIELDS_TABLE_PAGE_SIZE } from '../yieldsTableQuery'

interface TestRow {
	id: string
	apy?: number | null
	label?: string | null
	funding?: string | null
	nested?: {
		score?: number | null
	}
}

const sortAccessors = {
	apy: (row: TestRow) => row.apy,
	label: (row: TestRow) => row.label,
	funding: (row: TestRow) => row.funding,
	score: (row: TestRow) => row.nested?.score
}

describe('paginateAndSortRows', () => {
	it('uses default pagination when query params are absent', () => {
		const rows = Array.from({ length: 60 }, (_, index) => ({ id: String(index), apy: index }))

		const result = paginateAndSortRows({ rows, query: {}, sortAccessors })

		expect(result).toMatchObject({ total: 60, page: 1, pageSize: 50, hasMore: true })
		expect(result.rows).toHaveLength(50)
		expect(result.rows[0].id).toBe('0')
	})

	it('honors page and pageSize query params', () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({ id: String(index), apy: index }))

		const result = paginateAndSortRows({ rows, query: { page: '2', pageSize: '5' }, sortAccessors })

		expect(result).toMatchObject({ total: 12, page: 2, pageSize: 5, hasMore: true })
		expect(result.rows.map((row) => row.id)).toEqual(['5', '6', '7', '8', '9'])
	})

	it('caps regular pageSize query params', () => {
		const rows = Array.from({ length: MAX_YIELDS_TABLE_PAGE_SIZE + 10 }, (_, index) => ({
			id: String(index),
			apy: index
		}))

		const result = paginateAndSortRows({ rows, query: { pageSize: '999999' }, sortAccessors })

		expect(result).toMatchObject({
			total: MAX_YIELDS_TABLE_PAGE_SIZE + 10,
			page: 1,
			pageSize: MAX_YIELDS_TABLE_PAGE_SIZE,
			hasMore: true
		})
		expect(result.rows).toHaveLength(MAX_YIELDS_TABLE_PAGE_SIZE)
	})

	it('returns the full filtered set for pageSize=all', () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({ id: String(index), apy: index }))

		const result = paginateAndSortRows({ rows, query: { page: '2', pageSize: 'all' }, sortAccessors })

		expect(result).toMatchObject({ total: 12, page: 1, pageSize: 12, hasMore: false })
		expect(result.rows).toHaveLength(12)
	})

	it('clamps out-of-range pages to the last available page', () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({ id: String(index), apy: index }))

		const result = paginateAndSortRows({ rows, query: { page: '99', pageSize: '5' }, sortAccessors })

		expect(result).toMatchObject({ total: 12, page: 3, pageSize: 5, hasMore: false })
		expect(result.rows.map((row) => row.id)).toEqual(['10', '11'])
	})

	it('keeps stable ties and places missing values last', () => {
		const rows: TestRow[] = [
			{ id: 'missing', apy: null },
			{ id: 'first-tie', apy: 10 },
			{ id: 'second-tie', apy: 10 },
			{ id: 'low', apy: 1 }
		]

		const result = paginateAndSortRows({
			rows,
			query: { sortBy: 'apy', sortDesc: 'true', pageSize: 'all' },
			sortAccessors
		})

		expect(result.rows.map((row) => row.id)).toEqual(['first-tie', 'second-tie', 'low', 'missing'])
	})

	it('sorts numeric strings numerically', () => {
		const rows: TestRow[] = [
			{ id: 'negative', funding: '-0.500' },
			{ id: 'two', funding: '2.000' },
			{ id: 'ten', funding: '10.000' }
		]

		const result = paginateAndSortRows({
			rows,
			query: { sortBy: 'funding', sortDesc: 'true', pageSize: 'all' },
			sortAccessors
		})

		expect(result.rows.map((row) => row.id)).toEqual(['ten', 'two', 'negative'])
	})

	it('keeps mixed numeric-string and text sorting transitive', () => {
		const rows: TestRow[] = [
			{ id: 'text', funding: '85abc' },
			{ id: 'nine', funding: '9' },
			{ id: 'eighty', funding: '80' }
		]

		const result = paginateAndSortRows({
			rows,
			query: { sortBy: 'funding', sortDesc: 'false', pageSize: 'all' },
			sortAccessors
		})

		expect(result.rows.map((row) => row.id)).toEqual(['nine', 'eighty', 'text'])
	})

	it('ignores invalid sort keys when no fallback accessor is provided', () => {
		const rows: TestRow[] = [
			{ id: 'first', apy: 1 },
			{ id: 'second', apy: 2 }
		]

		const result = paginateAndSortRows({
			rows,
			query: { sortBy: 'missing', sortDesc: 'true', pageSize: 'all' },
			sortAccessors
		})

		expect(result.rows.map((row) => row.id)).toEqual(['first', 'second'])
	})

	it('uses the route default sort when the requested sort key is invalid', () => {
		const rows: TestRow[] = [
			{ id: 'first', nested: { score: 1 } },
			{ id: 'second', nested: { score: 2 } }
		]

		const result = paginateAndSortRows({
			rows,
			query: { sortBy: 'missing', sortDesc: 'true', pageSize: 'all' },
			sortAccessors,
			defaultSort: { sortBy: 'score', sortDesc: true }
		})

		expect(result.rows.map((row) => row.id)).toEqual(['second', 'first'])
	})

	it('supports top-level fallback accessors for legacy pool sort compatibility', () => {
		const rows: TestRow[] = [
			{ id: 'first', apy: 1 },
			{ id: 'second', apy: 2 }
		]

		const result = paginateAndSortRows<TestRow, string>({
			rows,
			query: { sortBy: 'apy', sortDesc: 'true', pageSize: 'all' },
			fallbackSortAccessor: (row, sortBy) => row[sortBy as keyof TestRow]
		})

		expect(result.rows.map((row) => row.id)).toEqual(['second', 'first'])
	})
})
