const DEFAULT_MAX_ENTRIES = 256

type CacheEntry<T> = {
	value: T
	expiresAt: number
}

type Store<T> = {
	entries: Map<string, CacheEntry<T>>
	inFlight: Map<string, Promise<T>>
}

const stores = new Map<string, Store<unknown>>()

function getStore<T>(namespace: string): Store<T> {
	let store = stores.get(namespace)
	if (!store) {
		store = { entries: new Map(), inFlight: new Map() }
		stores.set(namespace, store)
	}
	return store as Store<T>
}

function evictIfNeeded<T>(store: Store<T>, maxEntries: number) {
	const now = Date.now()
	for (const [key, entry] of store.entries) {
		if (entry.expiresAt <= now) store.entries.delete(key)
	}
	while (store.entries.size > maxEntries) {
		// Map iterates in insertion order; reads refresh entries, so this evicts
		// the least recently used key.
		const oldest = store.entries.keys().next().value
		if (oldest === undefined) break
		store.entries.delete(oldest)
	}
}

export type CachedResultOptions = {
	ttlMs: number
	/** Spread expiries so identical deploys don't recompute every key at once. Fraction of ttlMs, e.g. 0.2. */
	ttlJitter?: number
	maxEntries?: number
}

/**
 * Memoize an expensive server-side computation by key, coalescing concurrent
 * callers onto a single in-flight promise. Failed computations are never
 * cached. Intended for anonymous, param-bounded results (protocol splits,
 * chart breakdowns) whose recomputation blocks the event loop for seconds.
 */
export async function cachedResult<T>(
	namespace: string,
	key: string,
	options: CachedResultOptions,
	compute: () => Promise<T>
): Promise<T> {
	const store = getStore<T>(namespace)

	const cached = store.entries.get(key)
	if (cached && cached.expiresAt > Date.now()) {
		store.entries.delete(key)
		store.entries.set(key, cached)
		return cached.value
	}
	if (cached) {
		store.entries.delete(key)
	}

	const inFlight = store.inFlight.get(key)
	if (inFlight) {
		return inFlight
	}

	const promise = compute()
		.then((value) => {
			const jitterFraction = options.ttlJitter ?? 0
			const jitter = jitterFraction > 0 ? (Math.random() * 2 - 1) * jitterFraction * options.ttlMs : 0
			store.entries.set(key, { value, expiresAt: Date.now() + options.ttlMs + jitter })
			evictIfNeeded(store, options.maxEntries ?? DEFAULT_MAX_ENTRIES)
			return value
		})
		.finally(() => {
			store.inFlight.delete(key)
		})

	store.inFlight.set(key, promise)
	return promise
}
