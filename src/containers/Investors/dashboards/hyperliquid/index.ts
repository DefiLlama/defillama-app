import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Stats = lazy(() => import('./Stats'))
const Trades = lazy(() => import('./Trades'))
const Positions = lazy(() => import('./Positions'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Ecosystem' },
	{ id: 'stats', label: 'Stats', component: Stats, source: 'Hyperliquid' },
	{ id: 'trades', label: 'Trades', component: Trades, source: 'Hyperliquid' },
	{ id: 'positions', label: 'HLP Positions', component: Positions, source: 'Hyperliquid' },
	{ id: 'reports', label: 'Reports' },
	{ id: 'investor-calls', label: 'Investor Calls' }
]
