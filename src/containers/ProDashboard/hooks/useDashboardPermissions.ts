import { useMemo } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard } from '../services/DashboardAPI'

interface DashboardPermissions {
	isReadOnly: boolean
	isOwner: boolean
	dashboardOwnerId: string | null
}

export function useDashboardPermissions(dashboard: Dashboard | null): DashboardPermissions {
	const { user, isAuthenticated, hasActiveSubscription } = useAuthContext()

	return useMemo<DashboardPermissions>(() => {
		if (!dashboard) {
			return {
				isReadOnly: !hasActiveSubscription,
				isOwner: hasActiveSubscription,
				dashboardOwnerId: null
			}
		}

		if (dashboard.visibility === 'public') {
			const isOwner = isAuthenticated && user?.id === dashboard.user
			return {
				isReadOnly: !isOwner,
				isOwner: isOwner && hasActiveSubscription,
				dashboardOwnerId: dashboard.user
			}
		}

		const isOwner = isAuthenticated && user?.id === dashboard.user
		return {
			isReadOnly: !isOwner || !hasActiveSubscription,
			isOwner: isOwner && hasActiveSubscription,
			dashboardOwnerId: dashboard.user
		}
	}, [dashboard, user?.id, hasActiveSubscription, isAuthenticated])
}
