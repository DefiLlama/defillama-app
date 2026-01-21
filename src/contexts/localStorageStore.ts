type StorageListener = () => void

const keyListeners = new Map<string, Set<StorageListener>>()
const anyListeners = new Set<StorageListener>()
let activeListenerCount = 0
let isListening = false

// Batching mechanism to prevent main thread blocking
// When multiple storage changes happen in quick succession (e.g., after sign-in),
// we batch all notifications into a single microtask to avoid cascading re-renders
let pendingKeys = new Set<string>()
let notifyAllPending = false
let batchScheduled = false

const canUseStorage = () => {
	try {
		return typeof window !== 'undefined' && !!window.localStorage
	} catch {
		return false
	}
}

const addListeners = (target: Set<StorageListener>, listeners?: Set<StorageListener>) => {
	if (!listeners) return
	for (const listener of listeners) {
		target.add(listener)
	}
}

const flushPendingNotifications = () => {
	batchScheduled = false
	const keysToNotify = pendingKeys
	const shouldNotifyAll = notifyAllPending
	pendingKeys = new Set()
	notifyAllPending = false

	const uniqueListeners = new Set<StorageListener>()

	if (shouldNotifyAll) {
		for (const listeners of keyListeners.values()) {
			addListeners(uniqueListeners, listeners)
		}
	} else {
		for (const key of keysToNotify) {
			addListeners(uniqueListeners, keyListeners.get(key))
		}
	}
	addListeners(uniqueListeners, anyListeners)

	for (const listener of uniqueListeners) {
		listener()
	}
}

const scheduleBatch = () => {
	if (batchScheduled) return
	batchScheduled = true
	queueMicrotask(flushPendingNotifications)
}

const notifyAllKeys = () => {
	notifyAllPending = true
	scheduleBatch()
}

export const notifyKeyChange = (key: string) => {
	pendingKeys.add(key)
	scheduleBatch()
}

const handleStorageEvent = (event: StorageEvent) => {
	if (!canUseStorage()) return
	if (event.storageArea && event.storageArea !== window.localStorage) return

	if (!event.key) {
		notifyAllKeys()
		return
	}

	notifyKeyChange(event.key)
}

const ensureStorageListener = () => {
	if (!canUseStorage() || isListening) return
	window.addEventListener('storage', handleStorageEvent)
	isListening = true
}

const cleanupStorageListener = () => {
	if (!canUseStorage() || !isListening || activeListenerCount > 0) return
	window.removeEventListener('storage', handleStorageEvent)
	isListening = false
}

export const subscribeToStorageKey = (key: string, callback: StorageListener) => {
	ensureStorageListener()

	let listeners = keyListeners.get(key)
	if (!listeners) {
		listeners = new Set()
		keyListeners.set(key, listeners)
	}

	if (!listeners.has(callback)) {
		listeners.add(callback)
		activeListenerCount += 1
	}

	return () => {
		const currentListeners = keyListeners.get(key)
		if (!currentListeners?.has(callback)) return
		currentListeners.delete(callback)
		activeListenerCount -= 1
		if (currentListeners.size === 0) {
			keyListeners.delete(key)
		}
		cleanupStorageListener()
	}
}

export const subscribeToStorageKeys = (keys: string[], callback: StorageListener) => {
	const uniqueKeys = Array.from(new Set(keys))
	const unsubs = uniqueKeys.map((key) => subscribeToStorageKey(key, callback))

	return () => {
		for (const unsub of unsubs) {
			unsub()
		}
	}
}

export const subscribeToAnyStorage = (callback: StorageListener) => {
	ensureStorageListener()

	if (!anyListeners.has(callback)) {
		anyListeners.add(callback)
		activeListenerCount += 1
	}

	return () => {
		if (!anyListeners.has(callback)) return
		anyListeners.delete(callback)
		activeListenerCount -= 1
		cleanupStorageListener()
	}
}

export const getStorageItem = (key: string, fallback: string | null = null) => {
	if (!canUseStorage()) return fallback

	try {
		return window.localStorage.getItem(key) ?? fallback
	} catch {
		return fallback
	}
}

export const setStorageItem = (key: string, value: string) => {
	if (!canUseStorage()) return

	try {
		window.localStorage.setItem(key, value)
	} catch {
		return
	}

	notifyKeyChange(key)
}

export const removeStorageItem = (key: string) => {
	if (!canUseStorage()) return

	try {
		window.localStorage.removeItem(key)
	} catch {
		return
	}

	notifyKeyChange(key)
}

export const getStorageJSON = <T>(key: string, fallback: T) => {
	const raw = getStorageItem(key, null)
	if (!raw) return fallback
	try {
		return JSON.parse(raw) as T
	} catch {
		return fallback
	}
}

export const setStorageJSON = (key: string, value: unknown) => {
	setStorageItem(key, JSON.stringify(value))
}
