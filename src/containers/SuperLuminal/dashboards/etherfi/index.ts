import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const CreditCard = lazy(() => import('./CreditCard'))
const CashTransactions = lazy(() => import('./CashTransactions'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'card-usage', label: 'Credit Card', component: CreditCard, source: 'DefiLlama' },
	{ id: 'cash-transactions', label: 'Cash Transactions', component: CashTransactions, source: 'Dune' }
]
