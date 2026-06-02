import { lazy } from 'react'
import type { DashboardTabConfig } from '../../dashboardTypes'

const Tvl = lazy(() => import('./Tvl'))
const Revenue = lazy(() => import('./Revenue'))
const Incentives = lazy(() => import('./Incentives'))
const Yields = lazy(() => import('./Yields'))
const Treasury = lazy(() => import('./Treasury'))
const Growth = lazy(() => import('./Growth'))
const Pegs = lazy(() => import('./Pegs'))

// Mirrors metadata.links.octavTreasury from /api/odyssey-ecosystem/metadata.
// Kept as a constant because the tab list is static config (can't await the metadata fetch).
const OCTAV_TREASURY_URL = 'https://metronome.octav.fi/app/Treasury?board=overview'

export const tabs: DashboardTabConfig[] = [
	{ id: 'tvl', label: 'TVL', component: Tvl },
	{ id: 'revenue', label: 'Revenue', component: Revenue },
	{ id: 'incentives', label: 'Incentives', component: Incentives },
	{ id: 'yields', label: 'Yields', component: Yields },
	// Treasury currently redirects to the third-party Octav treasury explorer in a new tab.
	// `component: Treasury` is retained so the in-app view can be re-enabled later by removing
	// `externalHref`/`externalTooltip`.
	{
		id: 'treasury',
		label: 'Treasury',
		component: Treasury,
		externalHref: OCTAV_TREASURY_URL,
		externalTooltip: 'Opens the Metronome treasury on Octav (third-party) in a new tab'
	},
	{ id: 'growth', label: 'Growth', component: Growth },
	{ id: 'pegs', label: 'Pegs', component: Pegs }
]

export const header = lazy(() => import('./OdysseyHeader'))
