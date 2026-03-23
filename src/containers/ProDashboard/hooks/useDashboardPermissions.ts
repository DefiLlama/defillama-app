import { useMemo } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { Dashboard } from '../services/DashboardAPI'

interface DashboardPermissions {
	isReadOnly: boolean
	isOwner: boolean
	dashboardOwnerId: string | null
}

export function useDashboardPermissions(dashboard: Dashboard | null): DashboardPermissions {
	const { user, isAuthenticated, hasActiveSubscription } = useAuthContext()

	return useMemo<DashboardPermissions>(() => {
		// New dashboard (no existing dashboard loaded)
		if (!dashboard) {
			return {
				isReadOnly: !isAuthenticated,
				isOwner: isAuthenticated,
				dashboardOwnerId: null
			}
		}

		// Public dashboards: any authenticated owner can edit (free or subscribed)
		if (dashboard.visibility === 'public') {
			const isOwner = isAuthenticated && user?.id === dashboard.user
			return {
				isReadOnly: !isOwner,
				isOwner,
				dashboardOwnerId: dashboard.user
			}
		}

		// Private dashboards: still require subscription for edit access
		const isOwner = isAuthenticated && user?.id === dashboard.user
		return {
			isReadOnly: !isOwner || !hasActiveSubscription,
			isOwner: isOwner && hasActiveSubscription,
			dashboardOwnerId: dashboard.user
		}
	}, [dashboard, user?.id, hasActiveSubscription, isAuthenticated])
}
