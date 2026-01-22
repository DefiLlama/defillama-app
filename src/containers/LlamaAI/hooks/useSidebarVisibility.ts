import { useCallback, useState, useSyncExternalStore } from 'react'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import { useMedia } from '~/hooks/useMedia'

const SIDEBAR_STORAGE_KEY = 'llamaai-sidebar-hidden'

export function useSidebarVisibility() {
	const isMobile = useMedia('(max-width: 640px)')

	// Desktop: uses localStorage with sync across tabs
	const sidebarHiddenDesktop = useSyncExternalStore(
		(callback) => subscribeToStorageKey(SIDEBAR_STORAGE_KEY, callback),
		() => getStorageItem(SIDEBAR_STORAGE_KEY, 'true') ?? 'true',
		() => 'true'
	)

	const toggleSidebarDesktop = useCallback(() => {
		// Use getStorageItem to read consistently, treat missing/null as default 'true' (sidebar hidden by default)
		const currentValue = getStorageItem(SIDEBAR_STORAGE_KEY, 'true') ?? 'true'
		const currentHidden = currentValue === 'true'
		setStorageItem(SIDEBAR_STORAGE_KEY, String(!currentHidden))
	}, [])

	// Mobile: uses local state (no persistence needed)
	const [sidebarHiddenMobile, setSidebarHiddenMobile] = useState('true')

	const toggleSidebarMobile = useCallback(() => {
		setSidebarHiddenMobile((prev) => (prev === 'true' ? 'false' : 'true'))
	}, [])

	// Auto-hide sidebar on mobile when selecting a session
	const hideOnMobile = useCallback(() => {
		if (isMobile) {
			setSidebarHiddenMobile('true')
		}
	}, [isMobile])

	return {
		sidebarVisible: isMobile ? sidebarHiddenMobile !== 'true' : sidebarHiddenDesktop !== 'true',
		toggleSidebar: isMobile ? toggleSidebarMobile : toggleSidebarDesktop,
		hideOnMobile,
		isMobile
	}
}
