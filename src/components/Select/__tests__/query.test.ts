import type { NextRouter } from 'next/router'
import { describe, expect, it, vi } from 'vitest'
import { updateQueryFromSelected } from '../query'

const router = {} as NextRouter

describe('updateQueryFromSelected', () => {
	it('applies page reset before delegating to a custom query updater', () => {
		const pushQueryUpdates = vi.fn()

		updateQueryFromSelected(router, 'include', 'exclude', ['a', 'b'], 'a', undefined, {
			resetPage: true,
			pushQueryUpdates
		})

		expect(pushQueryUpdates).toHaveBeenCalledWith({
			include: 'a',
			exclude: undefined,
			page: undefined
		})
	})

	it('does not add page reset when resetPage is false', () => {
		const pushQueryUpdates = vi.fn()

		updateQueryFromSelected(router, 'include', 'exclude', ['a', 'b'], 'a', undefined, {
			pushQueryUpdates
		})

		expect(pushQueryUpdates).toHaveBeenCalledWith({
			include: 'a',
			exclude: undefined
		})
	})
})
