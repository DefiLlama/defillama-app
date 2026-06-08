import { useQueries } from '@tanstack/react-query'
import { useAuthContext } from '~/containers/Subscription/auth'
import { type Dashboard, dashboardAPI } from '../services/DashboardAPI'

const EMPTY_DASHBOARDS: Dashboard[] = []

export interface DiscoveryCategoryConfig {
	key: string
	title: string
	sortBy: 'trending' | 'popular' | 'recent'
	timeFrame?: '1d' | '7d'
	limit: number
}

export interface DiscoveryCategoryResponse {
	items: Dashboard[]
	page: number
	perPage: number
	totalItems: number
	totalPages: number
	searchParams?: any
}

export type DiscoveryCategoriesInitialData = Record<string, DiscoveryCategoryResponse>

export const DISCOVERY_CATEGORIES: DiscoveryCategoryConfig[] = [
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

export function useDiscoveryCategories(initialData?: DiscoveryCategoriesInitialData | null) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	const queries = useQueries({
		queries: DISCOVERY_CATEGORIES.map((category) => ({
			queryKey: ['pro-dashboard', 'discovery-category', category.key, isAuthenticated],
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
			staleTime: 1000 * 60 * 5,
			initialData: initialData?.[category.key]
		}))
	})

	const categories: Record<string, CategoryData> = {}
	for (let index = 0; index < DISCOVERY_CATEGORIES.length; index++) {
		const category = DISCOVERY_CATEGORIES[index]
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
