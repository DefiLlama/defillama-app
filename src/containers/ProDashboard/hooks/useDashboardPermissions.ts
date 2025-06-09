import { useState, useEffect } from 'react'
import { Dashboard } from '../services/DashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'

interface DashboardPermissions {
	isReadOnly: boolean
	isOwner: boolean
	dashboardOwnerId: string | null
}

export function useDashboardPermissions(dashboard: Dashboard | null): DashboardPermissions {
	const { user } = useAuthContext()
	const [permissions, setPermissions] = useState<DashboardPermissions>({
		isReadOnly: false,
		isOwner: true,
		dashboardOwnerId: null
	})

	useEffect(() => {
		if (!dashboard) {
			setPermissions({
				isReadOnly: false,
				isOwner: true,
				dashboardOwnerId: null
			})
			return
		}

		const isOwner = user?.id === dashboard.user
		setPermissions({
			isReadOnly: !isOwner,
			isOwner,
			dashboardOwnerId: dashboard.user
		})
	}, [dashboard, user?.id])

	return permissions
}