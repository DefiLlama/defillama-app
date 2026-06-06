import { describe, expect, it } from 'vitest'
import {
	applyEditorialTagOrderPayload,
	buildEditorialTagReorderPayload,
	listIndexToSortOrder
} from '../editorialTagOrder'
import type { ArticleDocument } from '../types'

function article(id: string): ArticleDocument {
	return { id, title: id, slug: id, status: 'published' } as ArticleDocument
}

describe('editorialTagOrder', () => {
	it('maps list index to descending sort order', () => {
		expect(listIndexToSortOrder(0, 4)).toBe(3)
		expect(listIndexToSortOrder(3, 4)).toBe(0)
	})

	it('builds payload for adjacent swap', () => {
		const previous = [article('A'), article('B'), article('C')]
		const reordered = [article('B'), article('A'), article('C')]

		expect(buildEditorialTagReorderPayload(previous, reordered)).toEqual(
			expect.arrayContaining([
				{ articleId: 'A', order: 1 },
				{ articleId: 'B', order: 2 }
			])
		)
	})

	it('builds payload when moving item down several positions', () => {
		const previous = [article('A'), article('B'), article('C'), article('D')]
		const reordered = [article('B'), article('C'), article('D'), article('A')]

		expect(buildEditorialTagReorderPayload(previous, reordered)).toEqual(
			expect.arrayContaining([
				{ articleId: 'A', order: 0 },
				{ articleId: 'B', order: 3 },
				{ articleId: 'C', order: 2 },
				{ articleId: 'D', order: 1 }
			])
		)
	})

	it('returns empty payload when order is unchanged', () => {
		const items = [article('A'), article('B')]
		expect(buildEditorialTagReorderPayload(items, items)).toEqual([])
	})

	it('applies payload to reorder cached items', () => {
		const items = [article('A'), article('B'), article('C')]
		const payload = [
			{ articleId: 'A', order: 1 },
			{ articleId: 'B', order: 2 }
		]

		expect(applyEditorialTagOrderPayload(items, payload).map((item) => item.id)).toEqual(['B', 'A', 'C'])
	})
})
