import { lazy } from 'react'
import type { DashboardTabConfig } from '../../registry'

const Revenue = lazy(() => import('./Revenue'))

export const tabs: DashboardTabConfig[] = [{ id: 'revenue', label: 'Revenue', component: Revenue }]

export const header = lazy(() => import('./NearHeader'))
