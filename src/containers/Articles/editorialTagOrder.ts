import type { ArticleDocument } from './types'

export type EditorialTagOrderItem = { articleId: string; order: number }

/** Backend sorts by `sort_order` DESC: first row in the UI = highest order; `order = 0` is last. */
export function listIndexToSortOrder(index: number, count: number): number {
	return count - 1 - index
}

export function buildEditorialTagReorderPayload(
	previous: ArticleDocument[],
	reordered: ArticleDocument[]
): EditorialTagOrderItem[] {
	const previousOrderById = new Map(
		previous.map((article, index) => [article.id, listIndexToSortOrder(index, previous.length)])
	)
	const items: EditorialTagOrderItem[] = []

	for (const [index, article] of reordered.entries()) {
		const order = listIndexToSortOrder(index, reordered.length)
		const previousOrder = previousOrderById.get(article.id)
		if (previousOrder !== order) {
			items.push({ articleId: article.id, order })
		}
	}

	return items
}

export function applyEditorialTagOrderPayload(
	items: ArticleDocument[],
	payload: EditorialTagOrderItem[]
): ArticleDocument[] {
	const orderById = new Map(items.map((article, index) => [article.id, listIndexToSortOrder(index, items.length)]))
	for (const { articleId, order } of payload) {
		orderById.set(articleId, order)
	}
	return items.toSorted((a, b) => (orderById.get(b.id) ?? 0) - (orderById.get(a.id) ?? 0))
}
