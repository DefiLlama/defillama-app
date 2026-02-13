import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const LiquidityLayer = lazy(() => import('./LiquidityLayer'))
const DistributionRewards = lazy(() => import('./DistributionRewards'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'liquidity-layer', label: 'Liquidity Layer', component: LiquidityLayer, source: 'Dune' },
	{ id: 'distribution-rewards', label: 'Distribution Rewards', component: DistributionRewards, source: 'Dune' }
]
