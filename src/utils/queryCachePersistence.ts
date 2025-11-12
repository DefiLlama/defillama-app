import type { QueryClient, QueryKey } from '@tanstack/react-query'

const STORAGE_PREFIX = 'rq:'
const STORAGE_VERSION = 1
const isBrowser = typeof window !== 'undefined'
let hasHydrated = false

type PersistRule = {
	name: string
	test: (key: QueryKey) => boolean
	getStorageKey: (key: QueryKey) => string | null
	maxAge: number
}

type StoredEntry = {
	version: number
	key: QueryKey
	data: unknown
	updatedAt: number
	rule: string
}

const persistRules: PersistRule[] = [
	{
		name: 'current-user',
		test: (key) => key[0] === 'currentUserAuthStatus',
		getStorageKey: () => `${STORAGE_PREFIX}current-user`,
		maxAge: 5 * 60 * 1000
	},
	{
		name: 'subscription',
		test: (key) => key[0] === 'subscription' && typeof key[1] === 'string' && typeof key[2] === 'string',
		getStorageKey: (key) => `${STORAGE_PREFIX}subscription:${String(key[1])}:${String(key[2])}`,
		maxAge: 15 * 60 * 1000
	},
	{
		name: 'lite-dashboards',
		test: (key) => key[0] === 'lite-dashboards' && typeof key[1] === 'string' && Boolean(key[1]),
		getStorageKey: (key) => `${STORAGE_PREFIX}lite-dashboards:${String(key[1])}`,
		maxAge: 5 * 60 * 1000
	}
]

function getRuleForKey(key: QueryKey): PersistRule | undefined {
	return persistRules.find((rule) => {
		if (!Array.isArray(key)) return false
		return rule.test(key)
	})
}

function saveEntry(storageKey: string, payload: StoredEntry) {
	if (!isBrowser) return
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(payload))
	} catch {}
}

function removeEntry(storageKey: string) {
	if (!isBrowser) return
	try {
		window.localStorage.removeItem(storageKey)
	} catch {}
}

function persistQuery(queryKey: QueryKey, data: unknown, updatedAt: number | undefined) {
	if (!isBrowser) return
	const rule = getRuleForKey(queryKey)
	if (!rule) return
	const storageKey = rule.getStorageKey(queryKey)
	if (!storageKey) return
	if (typeof data === 'undefined') {
		removeEntry(storageKey)
		return
	}
	const payload: StoredEntry = {
		version: STORAGE_VERSION,
		key: queryKey,
		data,
		updatedAt: updatedAt || Date.now(),
		rule: rule.name
	}
	saveEntry(storageKey, payload)
}

export function hydratePersistedQueries(queryClient: QueryClient) {
	if (!isBrowser) return
	const now = Date.now()
	const hydratedKeys: QueryKey[] = []
	for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
		const storageKey = window.localStorage.key(index)
		if (!storageKey || !storageKey.startsWith(STORAGE_PREFIX)) continue
		try {
			const raw = window.localStorage.getItem(storageKey)
			if (!raw) {
				window.localStorage.removeItem(storageKey)
				continue
			}
			const parsed = JSON.parse(raw) as StoredEntry
			if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.key)) {
				window.localStorage.removeItem(storageKey)
				continue
			}
			const rule = persistRules.find((candidate) => candidate.name === parsed.rule)
			if (!rule || !rule.test(parsed.key)) {
				window.localStorage.removeItem(storageKey)
				continue
			}
			if (now - parsed.updatedAt > rule.maxAge) {
				window.localStorage.removeItem(storageKey)
				continue
			}
			queryClient.setQueryData(parsed.key, parsed.data, { updatedAt: parsed.updatedAt })
			hydratedKeys.push(parsed.key)
		} catch {
			window.localStorage.removeItem(storageKey)
		}
	}
	if (hydratedKeys.length) {
		hydratedKeys.forEach((key) => {
			queryClient.invalidateQueries({ queryKey: key, exact: true })
		})
	}
}

export function ensurePersistedQueriesHydrated(queryClient: QueryClient) {
	if (!isBrowser || hasHydrated) return
	hydratePersistedQueries(queryClient)
	hasHydrated = true
}

export function subscribeToQueryPersistence(queryClient: QueryClient) {
	if (!isBrowser) return () => {}
	const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
		if (!event) return
		if (event.type === 'updated') {
			if (event.query.state.status !== 'success') return
			persistQuery(event.query.queryKey, event.query.state.data, event.query.state.dataUpdatedAt)
		} else if (event.type === 'removed') {
			const rule = getRuleForKey(event.query.queryKey)
			if (!rule) return
			const storageKey = rule.getStorageKey(event.query.queryKey)
			if (storageKey) {
				removeEntry(storageKey)
			}
		}
	})
	return unsubscribe
}

export function clearPersistedQueries() {
	if (!isBrowser) return
	for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
		const storageKey = window.localStorage.key(index)
		if (!storageKey || !storageKey.startsWith(STORAGE_PREFIX)) continue
		window.localStorage.removeItem(storageKey)
	}
}
