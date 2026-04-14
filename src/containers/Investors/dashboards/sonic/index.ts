import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'
import FeeM from './FeeM'

const VerticalIntegration = lazy(() => import('./VerticalIntegration'))
const Ecosystem = lazy(() => import('./Ecosystem'))
const YieldsEmissions = lazy(() => import('./YieldsEmissions'))
const NetworkStats = lazy(() => import('./NetworkStats'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'feem', label: 'FeeM', component: FeeM },
	{ id: 'ecosystem', label: 'Ecosystem', component: Ecosystem },
	{ id: 'vertical-integration', label: 'Vertical Integration', component: VerticalIntegration },
	{ id: 'yields-emissions', label: 'Yields & Emissions', component: YieldsEmissions },
	{ id: 'network-stats', label: 'Network Stats', component: NetworkStats }
]

export const header = lazy(() => import('./SonicHeader'))
