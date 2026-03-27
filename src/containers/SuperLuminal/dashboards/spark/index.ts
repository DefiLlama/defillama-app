import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'
import Financials from './Financials'

const QuarterlyReports = lazy(() => import('./QuarterlyReports'))
const DistributionRewards = lazy(() => import('./DistributionRewards'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'financials', label: 'Financials', component: Financials },
	{ id: 'dashboard', label: 'Overview' },
	{ id: 'distribution-rewards', label: 'Distribution Rewards', component: DistributionRewards },
	{ id: 'quarterly-reports', label: 'Press Releases', component: QuarterlyReports }
]

export const header = lazy(() => import('./SparkHeader'))
