import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Tvl = lazy(() => import('./Tvl'))
const Revenue = lazy(() => import('./Revenue'))
const Incentives = lazy(() => import('./Incentives'))
const Yields = lazy(() => import('./Yields'))
const Treasury = lazy(() => import('./Treasury'))
const Growth = lazy(() => import('./Growth'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'tvl', label: 'TVL', component: Tvl },
	{ id: 'revenue', label: 'Revenue', component: Revenue },
	{ id: 'incentives', label: 'Incentives', component: Incentives },
	{ id: 'yields', label: 'Yields', component: Yields },
	{ id: 'treasury', label: 'Treasury', component: Treasury },
	{ id: 'growth', label: 'Growth', component: Growth }
]

export const header = lazy(() => import('./OdysseyHeader'))
