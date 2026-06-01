import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const PoolsOverview = lazy(() => import('./PoolsOverview'))
const Loans = lazy(() => import('./Loans'))
const SyrupActivity = lazy(() => import('./SyrupActivity'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Overview' },
	{ id: 'pools', label: 'Pools Overview', component: PoolsOverview, source: 'Maple Finance' },
	{ id: 'loans', label: 'Loans', component: Loans, source: 'Maple Finance' },
	{ id: 'syrup', label: 'Syrup Activity', component: SyrupActivity, source: 'Maple Finance' }
]
