import { useQueries } from '@tanstack/react-query'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { type Dashboard, dashboardAPI } from '../services/DashboardAPI'

const EMPTY_DASHBOARDS: Dashboard[] = []

interface CategoryConfig {
	key: string
	title: string
	sortBy: 'trending' | 'popular' | 'recent'
	timeFrame?: '1d' | '7d'
	limit: number
}

const CATEGORIES: CategoryConfig[] = [
	{ key: 'trendingToday', title: 'Trending Today', sortBy: 'trending', timeFrame: '1d', limit: 8 },
	{ key: 'trendingWeek', title: 'Trending This Week', sortBy: 'trending', timeFrame: '7d', limit: 8 },
	{ key: 'popular', title: 'Most Popular', sortBy: 'popular', limit: 8 },
	{ key: 'recent', title: 'Recently Created', sortBy: 'recent', limit: 8 }
]

interface CategoryData {
	dashboards: Dashboard[]
	isLoading: boolean
	error: Error | null
}

export function useDiscoveryCategories() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	const queries = useQueries({
		queries: CATEGORIES.map((category) => ({
			queryKey: ['discovery-category', category.key],
			queryFn: async () => {
				return await dashboardAPI.searchDashboards(
					{
						visibility: 'public',
						sortBy: category.sortBy,
						timeFrame: category.timeFrame,
						page: 1,
						limit: category.limit
					},
					isAuthenticated ? authorizedFetch : undefined
				)
			},
			staleTime: 1000 * 60 * 5
		}))
	})

	const categories: Record<string, CategoryData> = {}
	for (let index = 0; index < CATEGORIES.length; index++) {
		const category = CATEGORIES[index]
		categories[category.key] = {
			dashboards: queries[index].data?.items ?? EMPTY_DASHBOARDS,
			isLoading: queries[index].isLoading,
			error: queries[index].error as Error | null
		}
	}

	return {
		categories,
		isAnyLoading: queries.some((q) => q.isLoading)
	}
}
