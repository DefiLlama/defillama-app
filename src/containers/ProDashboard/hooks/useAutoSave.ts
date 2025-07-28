import { useCallback, useRef } from 'react'
import { DashboardItemConfig } from '../types'

interface UseAutoSaveOptions {
	dashboardId: string | null
	dashboardName: string
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	isAuthenticated: boolean
	isReadOnly: boolean
	updateDashboard: (params: { id: string; data: { items: DashboardItemConfig[]; dashboardName: string; visibility: 'private' | 'public'; tags: string[]; description: string } }) => Promise<any>
	cleanItemsForSaving: (items: DashboardItemConfig[]) => DashboardItemConfig[]
	delay?: number
}

export function useAutoSave({
	dashboardId,
	dashboardName,
	dashboardVisibility,
	dashboardTags,
	dashboardDescription,
	isAuthenticated,
	isReadOnly,
	updateDashboard,
	cleanItemsForSaving,
	delay = 2000
}: UseAutoSaveOptions) {
	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const autoSave = useCallback(
		(newItems: DashboardItemConfig[]) => {
			if (!dashboardId || !isAuthenticated || isReadOnly) return

			// Clear existing timeout
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current)
			}

			// Clean items and prepare data
			const cleanedItems = cleanItemsForSaving(newItems)
			const data = {
				items: cleanedItems,
				dashboardName,
				visibility: dashboardVisibility,
				tags: dashboardTags,
				description: dashboardDescription
			}

			// Set new timeout
			autoSaveTimeoutRef.current = setTimeout(() => {
				updateDashboard({ id: dashboardId, data }).catch((error) => {
					console.error('Auto-save failed:', error)
				})
			}, delay)
		},
		[dashboardId, isAuthenticated, isReadOnly, dashboardName, dashboardVisibility, dashboardTags, dashboardDescription, cleanItemsForSaving, updateDashboard, delay]
	)

	// Cleanup function to clear timeout on unmount
	const clearAutoSave = useCallback(() => {
		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current)
			autoSaveTimeoutRef.current = null
		}
	}, [])

	return {
		autoSave,
		clearAutoSave
	}
}