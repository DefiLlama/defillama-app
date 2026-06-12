export type PublicDashboardAuthor = {
	slug: string
	displayName: string
	bio?: string | null
	avatarUrl?: string | null
	socials: Record<string, string>
	createdAt: string
	updatedAt: string
}

export type AuthorDashboardSummary = {
	id: string
	slug?: string
	data: {
		dashboardName?: string
		items?: Array<{ id?: string; kind?: string }>
	}
	visibility: 'public'
	tags?: string[]
	description?: string
	viewCount?: number
	likeCount?: number
	liked?: boolean
	metrics?: Record<string, unknown> | null
	editedAt?: string
	created?: string
	updated?: string
}

export type AuthorStats = {
	totalViews: number
	totalLikes: number
	followerCount: number
}

export type AuthorDashboardSort = 'recent' | 'popular' | 'likes'

export type AuthorPageResponse = {
	author: PublicDashboardAuthor
	stats: AuthorStats
	featured: AuthorDashboardSummary | null
	viewer?: { following: boolean }
	dashboards: {
		items: AuthorDashboardSummary[]
		page: number
		perPage: number
		totalItems: number
		totalPages: number
	}
}

export type TopAuthorEntry = {
	author: PublicDashboardAuthor
	totalViews: number
	totalLikes: number
	dashboardCount: number
	followerCount: number
}

export type AuthorProfileUpdate = {
	displayName?: string
	slug?: string
	bio?: string | null
	avatarUrl?: string | null
	socials?: Record<string, string>
}
