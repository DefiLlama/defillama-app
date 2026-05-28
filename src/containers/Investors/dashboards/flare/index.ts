import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Overview = lazy(() => import('./Overview'))
const Tokenomics = lazy(() => import('./Tokenomics'))
const Supply = lazy(() => import('./Supply'))
const Staking = lazy(() => import('./Staking'))
const Network = lazy(() => import('./Network'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'overview', label: 'Overview', component: Overview },
	{ id: 'tokenomics', label: 'Tokenomics', component: Tokenomics },
	{ id: 'supply', label: 'Supply', component: Supply },
	{ id: 'staking', label: 'Staking', component: Staking },
	{ id: 'network', label: 'Network', component: Network }
]

export const header = lazy(() => import('./FlareHeader'))
