import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'
import FeeM from './FeeM'

const Ecosystem = lazy(() => import('./Ecosystem'))
const YieldsEmissions = lazy(() => import('./YieldsEmissions'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'feem', label: 'FeeM', component: FeeM },
	{ id: 'ecosystem', label: 'Ecosystem', component: Ecosystem },
	{ id: 'yields-emissions', label: 'Yields & Emissions', component: YieldsEmissions }
]

export const header = lazy(() => import('./SonicHeader'))
