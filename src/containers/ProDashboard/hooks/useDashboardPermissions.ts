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
	const { user } = useAuthContext()
	const { subscription } = useSubscribe()
	const [permissions, setPermissions] = useState<DashboardPermissions>({
		isReadOnly: false,
		isOwner: true,
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

		const isOwner = user?.id === dashboard.user
		const hasActiveSubscription = subscription?.status === 'active'
		
		// User is readonly if they don't own the dashboard OR don't have an active subscription
		const isReadOnly = !isOwner || !hasActiveSubscription
		
		setPermissions({
			isReadOnly,
			isOwner: isOwner && hasActiveSubscription,
			dashboardOwnerId: dashboard.user
		})
	}, [dashboard, user?.id, subscription?.status])

	return permissions
}