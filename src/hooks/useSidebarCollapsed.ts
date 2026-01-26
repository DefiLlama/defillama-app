import { useCallback, useSyncExternalStore } from 'react'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function useSidebarCollapsed() {
	const isCollapsed = useSyncExternalStore(
		(callback) => subscribeToStorageKey(SIDEBAR_COLLAPSED_KEY, callback),
		() => getStorageItem(SIDEBAR_COLLAPSED_KEY, 'false') === 'true',
		() => false
	)

	const toggleCollapsed = useCallback(() => {
		setStorageItem(SIDEBAR_COLLAPSED_KEY, String(!isCollapsed))
	}, [isCollapsed])

	return { isCollapsed, toggleCollapsed }
}
