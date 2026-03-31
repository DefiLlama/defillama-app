import type { ComponentType, LazyExoticComponent } from 'react'

export interface DashboardTabConfig {
	id: string
	label: string
	component?: LazyExoticComponent<ComponentType> | ComponentType
	source?: string
}

export interface DashboardModule {
	tabs: DashboardTabConfig[]
	header?: LazyExoticComponent<ComponentType>
}

const DASHBOARD_REGISTRY: Record<string, () => Promise<DashboardModule>> = {
	eobgdbgg0d0hake: () => import('./dashboards/hyperliquid'),
	'73x90j3b28pfhgx': () => import('./dashboards/etherfi'),
	'9vn8xp43tdzo6gt': () => import('./dashboards/spark'),
	l5accmh9zooc32q: () => import('./dashboards/maple'),
	t62luatlj9thwx2: () => import('./dashboards/berachain'),
	g3rswlkr9khxa03: () => import('./dashboards/aave'),
	s0n1cd4shb0ard1: () => import('./dashboards/sonic'),
	n34rr3v3nu3d4sh: () => import('./dashboards/near')
}

export function getDashboardModule(dashboardId: string) {
	return DASHBOARD_REGISTRY[dashboardId]?.() ?? null
}
