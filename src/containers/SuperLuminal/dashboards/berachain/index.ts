import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const IncomeBreakdown = lazy(() => import('./IncomeBreakdown'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'income-breakdown', label: 'Income Breakdown', component: IncomeBreakdown, source: 'DefiLlama' }
]
