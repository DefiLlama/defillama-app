import type { DashboardTabConfig } from '../../dashboardTypes'

// Minimal IR dashboard: a single Overview tab bound to the DefiLlama custom dashboard.
// The Overview tab renders the project's `dashboardId` (see InvestorsContent), so no
// custom tab components or header are needed yet.
export const tabs: DashboardTabConfig[] = [{ id: 'dashboard', label: 'Overview' }]
