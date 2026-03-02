import { useSyncExternalStore } from 'react'

type StorageListener = () => void

const keyListeners = new Map<string, Set<StorageListener>>()
const anyListeners = new Set<StorageListener>()
let activeListenerCount = 0
let isListening = false

// Batching mechanism to reduce main thread pressure.
// When multiple storage changes happen in quick succession (e.g., after sign-in),
// we defer notifications to a later task so rendering can finish before listeners run.
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
		try {
			listener()
		} catch (error) {
			console.error('Storage listener failed', error)
		}
	}
}

const scheduleBatch = () => {
	if (batchScheduled) return
	batchScheduled = true
	setTimeout(flushPendingNotifications, 0)
}

const notifyAllKeys = () => {
	if (activeListenerCount === 0) return
	notifyAllPending = true
	scheduleBatch()
}

export const notifyKeyChange = (key: string) => {
	if (activeListenerCount === 0) return
	if (!keyListeners.get(key) && anyListeners.size === 0) return
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

	let previousValue: string | null = null
	try {
		previousValue = window.localStorage.getItem(key)
	} catch {
		// Ignore read errors and fall back to write attempt.
	}

	// Avoid redundant writes + notifications (can cause render/fetch loops).
	if (previousValue === value) return

	try {
		window.localStorage.setItem(key, value)
	} catch {
		return
	}

	notifyKeyChange(key)
}

export const removeStorageItem = (key: string) => {
	if (!canUseStorage()) return

	let hadValue = false
	let readFailed = false
	try {
		hadValue = window.localStorage.getItem(key) !== null
	} catch {
		// If reads are unreliable, we still want removals to notify subscribers.
		readFailed = true
	}

	try {
		window.localStorage.removeItem(key)
	} catch {
		return
	}

	// Only notify if something actually changed, or the initial read failed.
	if (hadValue || readFailed) {
		notifyKeyChange(key)
	}
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

// Stable subscribe-function cache keyed by storage key.
// Avoids creating a new closure on every render, which would cause
// useSyncExternalStore to unsubscribe + resubscribe each render.
const subscribeCache = new Map<string, (cb: () => void) => () => void>()

function getOrCreateSubscriber(key: string) {
	let sub = subscribeCache.get(key)
	if (!sub) {
		sub = (cb: () => void) => subscribeToStorageKey(key, cb)
		subscribeCache.set(key, sub)
	}
	return sub
}

export function useStorageItem(key: string, fallback: string): string
export function useStorageItem(key: string, fallback: null): string | null
export function useStorageItem(key: string, fallback: string | null): string | null {
	return useSyncExternalStore(
		getOrCreateSubscriber(key),
		() => getStorageItem(key, fallback as string) ?? fallback,
		() => fallback
	)
}
