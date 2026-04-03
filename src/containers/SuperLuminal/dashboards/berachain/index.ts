import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const IncomeBreakdown = lazy(() => import('./IncomeBreakdown'))
const Blockchain = lazy(() => import('./Blockchain'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'income-breakdown', label: 'Income Breakdown', component: IncomeBreakdown, source: 'DefiLlama' },
	{ id: 'blockchain', label: 'Blockchain', component: Blockchain },
	{ id: 'ecosystem', label: 'Ecosystem', proDashboardId: 'n0mxxclv8q96vrl' }
]

export const header = lazy(() => import('./BerachainHeader'))
