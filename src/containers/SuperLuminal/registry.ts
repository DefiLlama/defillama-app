import type { ComponentType, LazyExoticComponent } from 'react'

export interface DashboardTabConfig {
	id: string
	label: string
	component?: LazyExoticComponent<ComponentType>
}

const DASHBOARD_REGISTRY: Record<string, () => Promise<{ tabs: DashboardTabConfig[] }>> = {
	eobgdbgg0d0hake: () => import('./dashboards/hyperliquid')
}

export function getDashboardModule(dashboardId: string) {
	return DASHBOARD_REGISTRY[dashboardId]?.() ?? null
}
