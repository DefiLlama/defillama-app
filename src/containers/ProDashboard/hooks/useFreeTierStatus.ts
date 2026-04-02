import { useMemo } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useGetLiteDashboards } from './useDashboardAPI'

export const FREE_TIER_MAX_DASHBOARDS = 1

export function useFreeTierStatus() {
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()
	const { data: liteDashboards } = useGetLiteDashboards()

	return useMemo(() => {
		const isFreeUser = isAuthenticated && !hasActiveSubscription
		const dashboardCount = Array.isArray(liteDashboards) ? liteDashboards.length : 0
		const canCreateDashboard = hasActiveSubscription || (isFreeUser && dashboardCount < FREE_TIER_MAX_DASHBOARDS)

		return {
			isFreeUser,
			canCreateDashboard,
			dashboardCount,
			FREE_TIER_MAX_DASHBOARDS
		}
	}, [isAuthenticated, hasActiveSubscription, liteDashboards])
}
