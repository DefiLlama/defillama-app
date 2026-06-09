import type { DashboardModule } from './dashboardTypes'
export type { DashboardModule, DashboardTabConfig } from './dashboardTypes'

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
	'0dyss3y3c0sys7m1': () => import('./dashboards/odyssey-ecosystem'),
	bfqwxro9m0xnc9z: () => import('./dashboards/thorchain')
}

export function getDashboardModule(dashboardId: string) {
	return DASHBOARD_REGISTRY[dashboardId]?.() ?? null
}
