import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getAuthorBySlug, getMyDashboardAuthorProfile } from '~/containers/Authors/api'
import { AuthorProfileView } from '~/containers/Authors/AuthorProfileView'
import type { AuthorDashboardSort } from '~/containers/Authors/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { LoadingSpinner } from './LoadingSpinner'

const DASHBOARD_LIMIT = 24

export function MyProfileTab() {
	const { authorizedFetch, isAuthenticated, loaders, user } = useAuthContext()
	const [dashboardPage, setDashboardPage] = useState(1)
	const [dashboardSort, setDashboardSort] = useState<AuthorDashboardSort>('recent')

	const { data: profile, isError: profileFailed } = useQuery({
		queryKey: ['dashboard-author-profile', user?.id],
		queryFn: () => getMyDashboardAuthorProfile(authorizedFetch),
		enabled: isAuthenticated && !loaders.userLoading && !!user?.id,
		retry: false,
		refetchOnWindowFocus: false
	})
	const slug = profile?.slug

	const { data: view, isError: pageFailed } = useQuery({
		queryKey: ['author-page', slug, dashboardPage, dashboardSort, user?.id],
		queryFn: () =>
			getAuthorBySlug(slug!, { dashboardPage, dashboardLimit: DASHBOARD_LIMIT, dashboardSort }, authorizedFetch),
		enabled: !!slug && isAuthenticated,
		staleTime: 60_000,
		retry: false,
		refetchOnWindowFocus: false
	})

	if (profileFailed || pageFailed) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
				<p className="text-center text-(--text-label)">Your profile could not be loaded. Please try again later.</p>
			</div>
		)
	}

	if (!view) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
				<LoadingSpinner />
			</div>
		)
	}

	return (
		<AuthorProfileView
			view={view}
			sort={dashboardSort}
			isOwnProfile
			navigate={(params) => {
				if (params.sort && params.sort !== dashboardSort) {
					setDashboardSort(params.sort)
					setDashboardPage(1)
					return
				}
				if (params.page) setDashboardPage(params.page)
			}}
		/>
	)
}
