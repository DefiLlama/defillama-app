import { useCallback, useSyncExternalStore } from 'react'

const NOW_TICK_INTERVAL_MS = 30_000

let nowSecondsSnapshot = Math.floor(Date.now() / 1000)
const listeners = new Set<() => void>()
let intervalId: number | null = null

const notifyListeners = () => {
	for (const listener of listeners) {
		listener()
	}
}

const syncNowSecondsSnapshot = () => {
	const nextNowSeconds = Math.floor(Date.now() / 1000)
	if (nextNowSeconds !== nowSecondsSnapshot) {
		nowSecondsSnapshot = nextNowSeconds
		notifyListeners()
	}
}

const startClock = () => {
	if (intervalId !== null || typeof window === 'undefined') return
	intervalId = window.setInterval(syncNowSecondsSnapshot, NOW_TICK_INTERVAL_MS)
}

const stopClock = () => {
	if (intervalId === null) return
	window.clearInterval(intervalId)
	intervalId = null
}

const subscribeToNowSeconds = (listener: () => void) => {
	listeners.add(listener)
	syncNowSecondsSnapshot()
	startClock()

	return () => {
		listeners.delete(listener)
		if (listeners.size === 0) {
			stopClock()
		}
	}
}

const getNowSecondsSnapshot = () => nowSecondsSnapshot

const normalizeInitialNowSeconds = (value?: number) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return nowSecondsSnapshot
	return Math.floor(value)
}

export function useNowSeconds(initialNowSeconds?: number) {
	const getServerSnapshot = useCallback(() => normalizeInitialNowSeconds(initialNowSeconds), [initialNowSeconds])

	return useSyncExternalStore(subscribeToNowSeconds, getNowSecondsSnapshot, getServerSnapshot)
}
