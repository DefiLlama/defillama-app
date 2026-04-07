import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'
import Financials from './Financials'

const PressReleases = lazy(() => import('./PressReleases'))
const DistributionRewards = lazy(() => import('./DistributionRewards'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'financials', label: 'Financials', component: Financials },
	{ id: 'dashboard', label: 'Overview' },
	{ id: 'distribution-rewards', label: 'Distribution Rewards', component: DistributionRewards },
	{ id: 'press-releases', label: 'Reports & Press Releases', component: PressReleases }
]

export const header = lazy(() => import('./SparkHeader'))
