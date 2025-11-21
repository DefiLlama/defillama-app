import { useCallback, useRef } from 'react'
import { TimePeriod } from '../ProDashboardAPIContext'
import { DashboardItemConfig } from '../types'

interface UseAutoSaveOptions {
	dashboardId: string | null
	dashboardName: string
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	timePeriod: TimePeriod
	isAuthenticated: boolean
	isReadOnly: boolean
	currentDashboard: { user: string; aiGenerated?: Record<string, any> | null } | null
	userId: string | undefined
	updateDashboard: (params: {
		id: string
		data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			visibility: 'private' | 'public'
			tags: string[]
			description: string
			aiGenerated?: Record<string, any> | null
		}
	}) => Promise<any>
	cleanItemsForSaving: (items: DashboardItemConfig[]) => DashboardItemConfig[]
	delay?: number
}

interface AutoSaveOverrides {
	timePeriod?: TimePeriod
}

export function useAutoSave({
	dashboardId,
	dashboardName,
	dashboardVisibility,
	dashboardTags,
	dashboardDescription,
	timePeriod,
	isAuthenticated,
	isReadOnly,
	currentDashboard,
	userId,
	updateDashboard,
	cleanItemsForSaving,
	delay = 2000
}: UseAutoSaveOptions) {
	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const autoSave = useCallback(
		(newItems: DashboardItemConfig[], overrides?: AutoSaveOverrides) => {
			const isOwner = currentDashboard && userId && currentDashboard.user === userId
			const shouldBlock = !dashboardId || !isAuthenticated || isReadOnly || !isOwner

			if (shouldBlock) {
				return
			}

			// Clear existing timeout
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current)
			}

			// Clean items and prepare data
			const cleanedItems = cleanItemsForSaving(newItems)
			const data = {
				items: cleanedItems,
				dashboardName,
				timePeriod: overrides?.timePeriod ?? timePeriod,
				visibility: dashboardVisibility,
				tags: dashboardTags,
				description: dashboardDescription,
				aiGenerated: currentDashboard?.aiGenerated ?? null
			}

			// Set new timeout
			autoSaveTimeoutRef.current = setTimeout(() => {
				updateDashboard({ id: dashboardId, data }).catch((error) => {
					console.log('Auto-save failed:', error)
				})
			}, delay)
		},
		[
			dashboardId,
			isAuthenticated,
			isReadOnly,
			currentDashboard,
			userId,
			dashboardName,
			dashboardVisibility,
			dashboardTags,
			dashboardDescription,
			timePeriod,
			cleanItemsForSaving,
			updateDashboard,
			delay
		]
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
