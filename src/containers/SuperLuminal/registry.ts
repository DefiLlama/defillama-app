import type { ComponentType, LazyExoticComponent } from 'react'

export interface DashboardTabConfig {
	id: string
	label: string
	component?: LazyExoticComponent<ComponentType>
	source?: string
}

const DASHBOARD_REGISTRY: Record<string, () => Promise<{ tabs: DashboardTabConfig[] }>> = {
	eobgdbgg0d0hake: () => import('./dashboards/hyperliquid'),
	'73x90j3b28pfhgx': () => import('./dashboards/etherfi'),
	roxh2oxb1b7fhjz: () => import('./dashboards/spark'),
	l5accmh9zooc32q: () => import('./dashboards/maple')
}

export function getDashboardModule(dashboardId: string) {
	return DASHBOARD_REGISTRY[dashboardId]?.() ?? null
}
