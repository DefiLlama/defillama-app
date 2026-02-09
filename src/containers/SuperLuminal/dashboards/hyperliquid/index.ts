import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Stats = lazy(() => import('./Stats'))
const Trades = lazy(() => import('./Trades'))
const Positions = lazy(() => import('./Positions'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Ecosystem' },
	{ id: 'stats', label: 'Stats', component: Stats },
	{ id: 'trades', label: 'Trades', component: Trades },
	{ id: 'positions', label: 'HLP Positions', component: Positions }
]
