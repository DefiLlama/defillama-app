import { useCallback, useRef } from 'react'
import { DashboardItemConfig } from '../types'

interface UseAutoSaveOptions {
	dashboardId: string | null
	dashboardName: string
	isAuthenticated: boolean
	updateDashboard: (params: { id: string; data: { items: DashboardItemConfig[]; dashboardName: string } }) => Promise<any>
	cleanItemsForSaving: (items: DashboardItemConfig[]) => DashboardItemConfig[]
	delay?: number
}

export function useAutoSave({
	dashboardId,
	dashboardName,
	isAuthenticated,
	updateDashboard,
	cleanItemsForSaving,
	delay = 1000
}: UseAutoSaveOptions) {
	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const autoSave = useCallback(
		(newItems: DashboardItemConfig[]) => {
			if (!dashboardId || !isAuthenticated) return

			// Clear existing timeout
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current)
			}

			// Clean items and prepare data
			const cleanedItems = cleanItemsForSaving(newItems)
			const data = { items: cleanedItems, dashboardName }

			// Set new timeout
			autoSaveTimeoutRef.current = setTimeout(() => {
				updateDashboard({ id: dashboardId, data }).catch((error) => {
					console.error('Auto-save failed:', error)
				})
			}, delay)
		},
		[dashboardId, isAuthenticated, dashboardName, cleanItemsForSaving, updateDashboard, delay]
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