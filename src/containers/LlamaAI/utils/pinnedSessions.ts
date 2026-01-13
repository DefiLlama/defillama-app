export const PINNED_SESSIONS_KEY = 'llamaai-pinned-sessions'

const getStoredPinnedSessions = (): string[] => {
	if (typeof window === 'undefined') return []

	try {
		const storedValue = window.localStorage.getItem(PINNED_SESSIONS_KEY)
		const parsed = storedValue ? JSON.parse(storedValue) : []
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export const isSessionPinned = (sessionId: string): boolean => {
	const pinnedSessions = getStoredPinnedSessions()
	return pinnedSessions.includes(sessionId)
}

export const togglePinSession = (sessionId: string): boolean => {
	const currentPinned = getStoredPinnedSessions()
	const isPinned = currentPinned.includes(sessionId)
	
	const nextPinned = isPinned
		? currentPinned.filter((id) => id !== sessionId)
		: [...currentPinned, sessionId]

	window.localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(nextPinned))
	window.dispatchEvent(new Event('pinnedSessionsChange'))
	
	return !isPinned
}

export const subscribeToPinnedSessions = (callback: () => void) => {
	window.addEventListener('pinnedSessionsChange', callback)
	return () => {
		window.removeEventListener('pinnedSessionsChange', callback)
	}
}
