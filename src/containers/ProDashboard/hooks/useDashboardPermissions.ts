import { useEffect, useState } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Dashboard } from '../services/DashboardAPI'

interface DashboardPermissions {
	isReadOnly: boolean
	isOwner: boolean
	dashboardOwnerId: string | null
}

export function useDashboardPermissions(dashboard: Dashboard | null): DashboardPermissions {
	const { user, isAuthenticated, hasActiveSubscription } = useAuthContext()

	const [permissions, setPermissions] = useState<DashboardPermissions>({
		isReadOnly: true,
		isOwner: false,
		dashboardOwnerId: null
	})

	useEffect(() => {
		if (!dashboard) {
			// For new dashboards, non-subscribers are in readonly mode

			setPermissions({
				isReadOnly: !hasActiveSubscription,
				isOwner: hasActiveSubscription,
				dashboardOwnerId: null
			})
			return
		}

		if (dashboard.visibility === 'public') {
			const isOwner = isAuthenticated && user?.id === dashboard.user

			setPermissions({
				isReadOnly: !isOwner,
				isOwner: isOwner && hasActiveSubscription,
				dashboardOwnerId: dashboard.user
			})
			return
		}

		const isOwner = isAuthenticated && user?.id === dashboard.user

		const isReadOnly = !isOwner || !hasActiveSubscription

		setPermissions({
			isReadOnly,
			isOwner: isOwner && hasActiveSubscription,
			dashboardOwnerId: dashboard.user
		})
	}, [dashboard, user?.id, hasActiveSubscription, isAuthenticated])

	return permissions
}
