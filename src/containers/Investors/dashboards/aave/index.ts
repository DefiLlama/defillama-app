import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Markets = lazy(() => import('./Markets'))
const Rates = lazy(() => import('./Rates'))
const GHO = lazy(() => import('./GHO'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Overview' },
	{ id: 'markets', label: 'Markets', component: Markets, source: 'Aave' },
	{ id: 'rates', label: 'Rates', component: Rates, source: 'Aave' },
	{ id: 'gho', label: 'GHO', component: GHO, source: 'Aave' }
]
