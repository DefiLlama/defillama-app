import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { followAuthor } from './api'
import type { AuthorPageResponse } from './types'

export function FollowAuthorButton({
	slug,
	following,
	isOwnProfile
}: {
	slug: string
	following?: boolean
	isOwnProfile: boolean
}) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	const queryClient = useQueryClient()
	const mutation = useMutation({
		mutationFn: () => followAuthor(slug, authorizedFetch),
		onSuccess: (data) => {
			queryClient.setQueriesData(
				{ queryKey: ['author-page', slug], exact: false },
				(oldData: AuthorPageResponse | undefined) => {
					if (!oldData) return oldData
					return {
						...oldData,
						stats: { ...oldData.stats, followerCount: data.followerCount },
						viewer: { ...oldData.viewer, following: data.following }
					}
				}
			)
			queryClient.invalidateQueries({ queryKey: ['pro-dashboard', 'following-authors'] })
			toast.success(data.following ? 'Following author' : 'Unfollowed author')
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : 'Failed to update follow')
		}
	})

	if (isOwnProfile) return null

	const isFollowing = mutation.data?.following ?? following ?? false

	return (
		<button
			type="button"
			disabled={mutation.isPending}
			onClick={() => {
				if (!isAuthenticated) {
					toast.error('Please sign in to follow authors')
					return
				}
				mutation.mutate()
			}}
			className={`inline-flex min-w-24 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
				isFollowing
					? 'border border-(--cards-border) bg-(--app-bg) text-(--text-secondary) hover:border-(--link-text)/50 hover:text-(--link-text)'
					: 'bg-(--link-text) text-white hover:opacity-90'
			}`}
		>
			<Icon name={isFollowing ? 'check' : 'plus'} className="size-3.5" />
			{isFollowing ? 'Following' : 'Follow'}
		</button>
	)
}
