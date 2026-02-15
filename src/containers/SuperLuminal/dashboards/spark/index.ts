import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const SparkLend = lazy(() => import('./SparkLend'))
const SparkLiquidityLayer = lazy(() => import('./SparkLiquidityLayer'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'sparklend', label: 'SparkLend', component: SparkLend, source: 'DefiLlama' },
	{ id: 'liquidity-layer', label: 'Liquidity Layer', component: SparkLiquidityLayer, source: 'DefiLlama' }
]
