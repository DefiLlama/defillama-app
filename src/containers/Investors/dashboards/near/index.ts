import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Revenue = lazy(() => import('./Revenue'))
const Ecosystem = lazy(() => import('./Ecosystem'))
const Products = lazy(() => import('./Products'))
const Research = lazy(() => import('./Research'))

export const tabs: DashboardTabConfig[] = [
	{ id: 'revenue', label: 'Revenue', component: Revenue, group: 'Financials' },
	{ id: 'ecosystem', label: 'Ecosystem', component: Ecosystem, group: 'Ecosystem' },
	{ id: 'products', label: 'Products', component: Products, group: 'Protocol' },
	{ id: 'research', label: 'Reports & Research', component: Research, group: 'Resources' }
]

export const header = lazy(() => import('./NearHeader'))
