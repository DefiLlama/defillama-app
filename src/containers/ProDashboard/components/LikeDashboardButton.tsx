import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDashboardEngagement } from '../hooks/useDashboardEngagement'
import type { Dashboard } from '../services/DashboardAPI'

export const LikeDashboardButton = ({
	currentDashboard,
	dashboardVisibility,
	dashboardId
}: {
	currentDashboard: Dashboard
	dashboardVisibility: 'private' | 'public'
	dashboardId: string
}) => {
	const { isAuthenticated } = useAuthContext()
	const { toggleLike, isLiking, liked, likeCount } = useDashboardEngagement(dashboardId)
	if (dashboardVisibility === 'private') return null
	const isLiked = !!currentDashboard?.liked
	return (
		<Tooltip
			content={currentDashboard?.liked ? 'Unlike dashboard' : 'Like dashboard'}
			render={<button onClick={() => toggleLike()} disabled={isLiking || !isAuthenticated} />}
			className={`flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue`}
		>
			{isLiking ? (
				<LoadingSpinner size={14} />
			) : (
				<Icon
					name="star"
					height={14}
					width={14}
					className={(liked ?? isLiked) ? 'fill-current text-yellow-400' : 'fill-none'}
				/>
			)}
			<span>{likeCount || currentDashboard?.likeCount || 0}</span>
			<span className="sr-only">Likes</span>
		</Tooltip>
	)
}
