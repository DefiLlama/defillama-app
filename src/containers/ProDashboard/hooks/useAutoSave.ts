import { useCallback, useEffect, useRef } from 'react'
import pb from '~/utils/pocketbase'
import { AUTH_SERVER } from '~/constants'
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

interface PendingSaveData {
	dashboardId: string
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
}

export function useAutoSave(options: UseAutoSaveOptions) {
	const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const pendingDataRef = useRef<PendingSaveData | null>(null)

	const flushPendingSave = useCallback(() => {
		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current)
			autoSaveTimeoutRef.current = null
		}

		const pending = pendingDataRef.current
		const token = pb.authStore.token

		if (pending && token) {
			fetch(`${AUTH_SERVER}/dashboards/${pending.dashboardId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ data: pending.data }),
				keepalive: true
			})
			pendingDataRef.current = null
		}
	}, [])

	useEffect(() => {
		const handlePageHide = () => flushPendingSave()
		const handleBeforeUnload = () => flushPendingSave()
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				flushPendingSave()
			}
		}

		window.addEventListener('pagehide', handlePageHide)
		window.addEventListener('beforeunload', handleBeforeUnload)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			flushPendingSave()
			window.removeEventListener('pagehide', handlePageHide)
			window.removeEventListener('beforeunload', handleBeforeUnload)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [flushPendingSave])

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
			delay = 800
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

		pendingDataRef.current = { dashboardId, data }

		autoSaveTimeoutRef.current = setTimeout(() => {
			updateDashboard({ id: dashboardId, data })
				.then(() => {
					pendingDataRef.current = null
				})
				.catch((error) => {
					console.log('Auto-save failed:', error)
				})
		}, delay)
	}, [])

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
