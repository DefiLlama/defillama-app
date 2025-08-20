import { useEffect, useState } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { Dashboard } from '../services/DashboardAPI'

interface DashboardPermissions {
	isReadOnly: boolean
	isOwner: boolean
	dashboardOwnerId: string | null
}

export function useDashboardPermissions(dashboard: Dashboard | null): DashboardPermissions {
	const { user, isAuthenticated } = useAuthContext()
	const { subscription } = useSubscribe()
	const [permissions, setPermissions] = useState<DashboardPermissions>({
		isReadOnly: true,
		isOwner: false,
		dashboardOwnerId: null
	})

	useEffect(() => {
		if (!dashboard) {
			// For new dashboards, non-subscribers are in readonly mode
			const hasActiveSubscription = subscription?.status === 'active'
			setPermissions({
				isReadOnly: !hasActiveSubscription,
				isOwner: hasActiveSubscription,
				dashboardOwnerId: null
			})
			return
		}

		if (dashboard.visibility === 'public') {
			const isOwner = isAuthenticated && user?.id === dashboard.user
			const hasActiveSubscription = subscription?.status === 'active'

			setPermissions({
				isReadOnly: !isOwner,
				isOwner: isOwner && hasActiveSubscription,
				dashboardOwnerId: dashboard.user
			})
			return
		}

		const isOwner = isAuthenticated && user?.id === dashboard.user
		const hasActiveSubscription = subscription?.status === 'active'

		const isReadOnly = !isOwner || !hasActiveSubscription

		setPermissions({
			isReadOnly,
			isOwner: isOwner && hasActiveSubscription,
			dashboardOwnerId: dashboard.user
		})
	}, [dashboard, user?.id, subscription?.status, isAuthenticated])

	return permissions
}
