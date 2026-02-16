import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const SparkLend = lazy(() => import('./SparkLend'))
const LiquidityLayer = lazy(() => import('./LiquidityLayer'))
const DistributionRewards = lazy(() => import('./DistributionRewards'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Overview' },
	{ id: 'sparklend', label: 'SparkLend', component: SparkLend, source: 'DefiLlama' },
	{ id: 'liquidity-layer', label: 'Liquidity Layer', component: LiquidityLayer, source: 'Dune' },
	{ id: 'distribution-rewards', label: 'Distribution Rewards', component: DistributionRewards, source: 'Dune' }
]
