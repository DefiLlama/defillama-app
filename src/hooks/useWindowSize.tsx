import { useSyncExternalStore } from 'react'

interface Size {
	width: number | undefined
	height: number | undefined
}

const getServerSnapshot = (): Size => ({
	width: undefined,
	height: undefined
})

const getClientSnapshot = (): Size => {
	return {
		width: window.innerWidth,
		height: window.innerHeight
	}
}

let windowSizeSnapshot: Size = typeof window === 'undefined' ? getServerSnapshot() : getClientSnapshot()
let resizeTimeoutId: number | null = null
const listeners = new Set<() => void>()

const publishSnapshotIfChanged = () => {
	if (typeof window === 'undefined') return
	const nextSnapshot = getClientSnapshot()
	if (nextSnapshot.width === windowSizeSnapshot.width && nextSnapshot.height === windowSizeSnapshot.height) return
	windowSizeSnapshot = nextSnapshot
	for (const listener of listeners) {
		listener()
	}
}

const handleResize = () => {
	if (resizeTimeoutId !== null) {
		window.clearTimeout(resizeTimeoutId)
	}
	resizeTimeoutId = window.setTimeout(() => {
		resizeTimeoutId = null
		publishSnapshotIfChanged()
	}, 1000)
}

const subscribe = (listener: () => void) => {
	if (typeof window === 'undefined') return () => {}

	listeners.add(listener)
	if (listeners.size === 1) {
		window.addEventListener('resize', handleResize)
	}

	publishSnapshotIfChanged()

	return () => {
		listeners.delete(listener)
		if (listeners.size === 0) {
			window.removeEventListener('resize', handleResize)
			if (resizeTimeoutId !== null) {
				window.clearTimeout(resizeTimeoutId)
				resizeTimeoutId = null
			}
		}
	}
}

export default function useWindowSize(): Size {
	return useSyncExternalStore(subscribe, () => windowSizeSnapshot, getServerSnapshot)
}
