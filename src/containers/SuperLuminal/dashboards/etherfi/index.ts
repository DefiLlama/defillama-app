import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const CreditCard = lazy(() => import('./CreditCard'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'card-usage', label: 'Credit Card', component: CreditCard, source: 'DefiLlama' }
]
