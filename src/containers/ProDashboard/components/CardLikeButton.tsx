import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDashboardEngagement } from '../hooks/useDashboardEngagement'

export function CardLikeButton({
	dashboardId,
	liked,
	likeCount
}: {
	dashboardId: string
	liked?: boolean
	likeCount?: number
}) {
	const { toggleLike, isLiking, liked: mutatedLiked, likeCount: mutatedLikeCount } = useDashboardEngagement(dashboardId)
	const isLiked = mutatedLiked ?? !!liked
	const count = mutatedLikeCount ?? likeCount ?? 0

	return (
		<button
			type="button"
			aria-label={isLiked ? 'Unlike dashboard' : 'Like dashboard'}
			disabled={isLiking}
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
				toggleLike()
			}}
			className="z-10 flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-600 tabular-nums transition-colors hover:bg-blue-500/30 dark:text-blue-400"
			title={isLiked ? 'Unlike dashboard' : 'Like dashboard'}
		>
			{isLiking ? (
				<LoadingSpinner size={12} />
			) : (
				<Icon
					name="star"
					height={12}
					width={12}
					className={isLiked ? 'fill-current text-yellow-500 dark:text-yellow-400' : 'fill-none'}
				/>
			)}
			{count}
		</button>
	)
}
