import { useSyncExternalStore } from 'react'

let currentSecondSnapshot = Math.floor(Date.now() / 1000)
const currentSecondListeners = new Set<() => void>()
let currentSecondIntervalId: number | null = null

function notifyCurrentSecondListeners() {
	for (const listener of currentSecondListeners) {
		listener()
	}
}

function syncCurrentSecondSnapshot() {
	const nextSecond = Math.floor(Date.now() / 1000)
	if (nextSecond === currentSecondSnapshot) return
	currentSecondSnapshot = nextSecond
	notifyCurrentSecondListeners()
}

function subscribeToCurrentSecond(listener: () => void) {
	currentSecondListeners.add(listener)
	syncCurrentSecondSnapshot()

	if (currentSecondIntervalId === null && typeof window !== 'undefined') {
		currentSecondIntervalId = window.setInterval(syncCurrentSecondSnapshot, 1000)
	}

	return () => {
		currentSecondListeners.delete(listener)
		if (currentSecondListeners.size === 0 && currentSecondIntervalId !== null) {
			window.clearInterval(currentSecondIntervalId)
			currentSecondIntervalId = null
		}
	}
}

export function useCurrentSecond() {
	return useSyncExternalStore(
		subscribeToCurrentSecond,
		() => currentSecondSnapshot,
		() => currentSecondSnapshot
	)
}
