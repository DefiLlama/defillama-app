import { useCallback, useRef } from 'react'
import { CustomTimePeriod, TimePeriod } from '../ProDashboardAPIContext'
import { DashboardItemConfig } from '../types'

interface UseAutoSaveOptions {
	dashboardId: string | null
	dashboardName: string
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	timePeriod: TimePeriod
	customTimePeriod: CustomTimePeriod | null
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
			customTimePeriod?: CustomTimePeriod | null
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
	customTimePeriod?: CustomTimePeriod | null
}

export function useAutoSave(options: UseAutoSaveOptions) {
	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const autoSave = useCallback((newItems: DashboardItemConfig[], overrides?: AutoSaveOverrides) => {
		const {
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
			customTimePeriod,
			cleanItemsForSaving,
			updateDashboard,
			delay = 2000
		} = optionsRef.current

		const isOwner = currentDashboard && userId && currentDashboard.user === userId
		const shouldBlock = !dashboardId || !isAuthenticated || isReadOnly || !isOwner

		if (shouldBlock) {
			return
		}

		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current)
		}

		const cleanedItems = cleanItemsForSaving(newItems)
		const data = {
			items: cleanedItems,
			dashboardName,
			timePeriod: overrides?.timePeriod ?? timePeriod,
			customTimePeriod: overrides?.customTimePeriod !== undefined ? overrides.customTimePeriod : customTimePeriod,
			visibility: dashboardVisibility,
			tags: dashboardTags,
			description: dashboardDescription,
			aiGenerated: currentDashboard?.aiGenerated ?? null
		}

		autoSaveTimeoutRef.current = setTimeout(() => {
			updateDashboard({ id: dashboardId, data }).catch((error) => {
				console.log('Auto-save failed:', error)
			})
		}, delay)
	}, [])

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
