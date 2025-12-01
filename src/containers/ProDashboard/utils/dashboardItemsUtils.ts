import { Dashboard, dashboardAPI } from '../services/DashboardAPI'
import { DashboardItemConfig } from '../types'
import { cleanItemsForSaving } from './dashboardUtils'

export async function addItemToDashboard(
	dashboardId: string,
	newItem: DashboardItemConfig,
	authorizedFetch: (url: string, options?: any) => Promise<Response>
): Promise<Dashboard> {
	const dashboard = await dashboardAPI.getDashboard(dashboardId, authorizedFetch)

	const updatedItems = [...(dashboard.data.items ?? []), newItem]

	return dashboardAPI.updateDashboard(
		dashboardId,
		{
			items: cleanItemsForSaving(updatedItems),
			dashboardName: dashboard.data.dashboardName,
			timePeriod: dashboard.data.timePeriod,
			visibility: dashboard.visibility,
			tags: dashboard.tags,
			description: dashboard.description,
			aiGenerated: dashboard.aiGenerated ?? null
		},
		authorizedFetch
	)
}
