import { describe, expect, it, vi } from 'vitest'
import { cachedResult } from '../resultCache'

describe('cachedResult', () => {
	it('evicts the least recently used entry when the namespace reaches capacity', async () => {
		const namespace = 'result-cache-lru-test'
		const compute = vi.fn(async (key: string) => key)
		const options = { ttlMs: 60_000, maxEntries: 2 }

		await cachedResult(namespace, 'a', options, () => compute('a'))
		await cachedResult(namespace, 'b', options, () => compute('b'))
		await cachedResult(namespace, 'a', options, () => compute('a'))
		await cachedResult(namespace, 'c', options, () => compute('c'))
		await cachedResult(namespace, 'a', options, () => compute('a'))
		await cachedResult(namespace, 'b', options, () => compute('b'))

		expect(compute.mock.calls.map(([key]) => key)).toEqual(['a', 'b', 'c', 'b'])
	})
})
