import type { ComponentType, LazyExoticComponent } from 'react'

export interface DashboardTabConfig {
	id: string
	label: string
	component?: LazyExoticComponent<ComponentType> | ComponentType
	proDashboardId?: string
	source?: string
	group?: string
	/**
	 * When set, this tab is rendered as an external link that opens the given URL
	 * in a new tab (instead of switching to in-app content). Used e.g. to point the
	 * Treasury tab at a third-party treasury explorer. The tab's `component` is kept
	 * so the in-app view can be re-enabled later by removing `externalHref`.
	 */
	externalHref?: string
	/** Tooltip shown on an external-link tab (e.g. "Opens Octav in a new tab"). */
	externalTooltip?: string
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
	n34rr3v3nu3d4sh: () => import('./dashboards/near'),
	fl4r3d4shb0ard1: () => import('./dashboards/flare'),
	'0dyss3y3c0sys7m1': () => import('./dashboards/odyssey-ecosystem')
}

export function getDashboardModule(dashboardId: string) {
	return DASHBOARD_REGISTRY[dashboardId]?.() ?? null
}
