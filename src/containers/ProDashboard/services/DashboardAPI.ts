import type { PublicDashboardAuthor } from '~/containers/Authors/types'
import { FEATURES_SERVER } from '../../../constants'
import type { CustomTimePeriod, TimePeriod } from '../ProDashboardAPIContext'
import type { DashboardItemConfig } from '../types'

export interface Dashboard {
	id: string
	slug?: string
	user: string
	data: {
		items: DashboardItemConfig[]
		dashboardName: string
		timePeriod?: TimePeriod
		customTimePeriod?: CustomTimePeriod | null
		aiUndoState?: {
			items: DashboardItemConfig[]
			timestamp: string
			sessionId: string
		}
	}
	visibility?: 'private' | 'public'
	tags?: string[]
	description?: string
	viewCount?: number
	likeCount?: number
	liked?: boolean
	author?: PublicDashboardAuthor
	created: string
	updated: string
	editedAt?: string
	collectionId?: string
	collectionName?: string
	aiGenerated?: Record<
		string,
		{
			mode: 'create' | 'iterate'
			prompt: string
			rated: boolean
			rating?: number
			feedback?: string
			skipped?: boolean
			timestamp: string
			userId: string
		}
	> | null
}

export interface FollowingShelf {
	author: PublicDashboardAuthor
	dashboardCount: number
	lastUpdated: string | null
	dashboards: Dashboard[]
}

interface LiteDashboard {
	id: string
	name: string
	slug?: string
}

export function dashboardUrlKey(dashboard: { id: string; slug?: string }): string {
	return dashboard.slug || dashboard.id
}

export function matchesDashboardKey(
	dashboard: { id: string; slug?: string } | null | undefined,
	key: string | null | undefined
): boolean {
	return !!dashboard && !!key && (dashboard.id === key || dashboard.slug === key)
}

export class DashboardError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'DashboardError'
		this.status = status
		Object.setPrototypeOf(this, DashboardError.prototype)
	}
}

type DashboardSavePayload = {
	items: DashboardItemConfig[]
	dashboardName: string
	timePeriod?: TimePeriod
	customTimePeriod?: CustomTimePeriod | null
	visibility?: 'private' | 'public'
	tags?: string[]
	description?: string
	aiGenerated?: Record<string, any> | null
}

function dashboardSaveBody(data: DashboardSavePayload) {
	const { visibility, tags, description, aiGenerated, ...dashboardData } = data
	return {
		data: dashboardData,
		visibility: visibility || 'private',
		tags: Array.isArray(tags) ? tags : [],
		description: typeof description === 'string' ? description : '',
		aiGenerated: aiGenerated || null
	}
}

function dashboardSaveUrl(id?: string) {
	return id ? `${FEATURES_SERVER}/dashboards/${encodeURIComponent(id)}` : `${FEATURES_SERVER}/dashboards`
}

export function buildDashboardSaveRequest(params: { id?: string; data: DashboardSavePayload }) {
	return {
		url: dashboardSaveUrl(params.id),
		options: {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(dashboardSaveBody(params.data))
		}
	}
}

class DashboardAPIService {
	private async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			let message = response.statusText || 'An error occurred'

			try {
				const errorData = await response.json()
				message = errorData.message || message
			} catch {}

			throw new DashboardError(message, response.status)
		}

		return response.json()
	}

	async listDashboards(authorizedFetch: (url: string, options?: any) => Promise<Response>): Promise<Dashboard[]> {
		const response = await authorizedFetch(`${FEATURES_SERVER}/dashboards`)
		const data = await this.handleResponse<{ items: Dashboard[] }>(response)
		return data.items || []
	}

	async listLiteDashboards(
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<LiteDashboard[]> {
		const response = await authorizedFetch(`${FEATURES_SERVER}/lite/dashboards`)
		const data = await this.handleResponse<{ items: LiteDashboard[] }>(response)
		return data.items || []
	}

	async listDashboardsPaginated(
		params: { page?: number; limit?: number },
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ items: Dashboard[]; page: number; perPage: number; totalItems: number; totalPages: number }> {
		const searchParams = new URLSearchParams()
		if (params.page) searchParams.append('page', params.page.toString())
		if (params.limit) searchParams.append('limit', params.limit.toString())

		const response = await authorizedFetch(`${FEATURES_SERVER}/dashboards?${searchParams.toString()}`)
		return this.handleResponse(response)
	}

	async getDashboard(
		id: string,
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const url = `${FEATURES_SERVER}/dashboards/${id}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse<Dashboard>(response)
	}

	async createDashboard(
		data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			customTimePeriod?: CustomTimePeriod | null
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
			aiGenerated?: Record<string, any> | null
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const { url, options } = buildDashboardSaveRequest({ data })
		const response = await authorizedFetch(url, options)

		return this.handleResponse<Dashboard>(response)
	}

	async updateDashboard(
		id: string,
		data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			customTimePeriod?: CustomTimePeriod | null
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
			aiGenerated?: Record<string, any> | null
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const { url, options } = buildDashboardSaveRequest({ id, data })
		const response = await authorizedFetch(url, options)

		return this.handleResponse<Dashboard>(response)
	}

	async deleteDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ message: string }> {
		const response = await authorizedFetch(`${FEATURES_SERVER}/dashboards/delete/${id}`, {
			method: 'POST'
		})

		return this.handleResponse<{ message: string }>(response)
	}

	async discoverDashboards(
		params?: { page?: number; limit?: number },
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<{ items: Dashboard[]; page: number; perPage: number; totalItems: number; totalPages: number }> {
		const queryParams = new URLSearchParams()
		if (params?.page) queryParams.append('page', params.page.toString())
		if (params?.limit) queryParams.append('limit', params.limit.toString())

		const url = `${FEATURES_SERVER}/dashboards/discover?${queryParams.toString()}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse(response)
	}

	async searchDashboards(
		params: {
			query?: string
			tags?: string[]
			visibility?: 'public' | 'private'
			sortBy?: 'popular' | 'recent' | 'likes' | 'trending'
			timeFrame?: '1d' | '7d' | '30d'
			page?: number
			limit?: number
		},
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<{
		items: Dashboard[]
		page: number
		perPage: number
		totalItems: number
		totalPages: number
		searchParams: any
	}> {
		const queryParams = new URLSearchParams()
		if (params.query) queryParams.append('query', params.query)
		if (params.tags?.length) queryParams.append('tags', params.tags.join(','))
		if (params.visibility) queryParams.append('visibility', params.visibility)
		if (params.sortBy) queryParams.append('sortBy', params.sortBy)
		if (params.timeFrame) queryParams.append('timeFrame', params.timeFrame)
		if (params.page) queryParams.append('page', params.page.toString())
		if (params.limit) queryParams.append('limit', params.limit.toString())

		const url = `${FEATURES_SERVER}/dashboards/search?${queryParams.toString()}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse(response)
	}

	async viewDashboard(
		id: string,
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const url = `${FEATURES_SERVER}/dashboards/${id}/view`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse<Dashboard>(response)
	}

	async likeDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ liked: boolean; likeCount: number }> {
		const response = await authorizedFetch(`${FEATURES_SERVER}/dashboards/${id}/like`, {
			method: 'POST'
		})
		return this.handleResponse(response)
	}

	async getLikedDashboards(
		params: {
			page?: number
			limit?: number
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{
		items: Dashboard[]
		page: number
		perPage: number
		totalItems: number
		totalPages: number
	}> {
		const searchParams = new URLSearchParams()
		if (params.page) searchParams.append('page', params.page.toString())
		if (params.limit) searchParams.append('limit', params.limit.toString())

		const response = await authorizedFetch(`${FEATURES_SERVER}/dashboards/liked?${searchParams}`)
		return this.handleResponse(response)
	}

	async getFollowingAuthors(
		params: {
			page?: number
			limit?: number
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{
		items: FollowingShelf[]
		page: number
		perPage: number
		totalItems: number
		totalPages: number
	}> {
		const searchParams = new URLSearchParams()
		if (params.page) searchParams.append('page', params.page.toString())
		if (params.limit) searchParams.append('limit', params.limit.toString())

		const response = await authorizedFetch(`${FEATURES_SERVER}/authors/following?${searchParams}`)
		return this.handleResponse(response)
	}
}

export const dashboardAPI = new DashboardAPIService()
