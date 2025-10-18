import { AUTH_SERVER } from '../../../constants'
import { TimePeriod } from '../ProDashboardAPIContext'
import { DashboardItemConfig } from '../types'

export interface Dashboard {
	id: string
	user: string
	data: {
		items: DashboardItemConfig[]
		dashboardName: string
		timePeriod?: TimePeriod
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
	created: string
	updated: string
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

interface LiteDashboard {
	id: string
	name: string
}

export interface DashboardError {
	message: string
	status: number
}

class DashboardAPIService {
	private async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const error: DashboardError = {
				message: response.statusText || 'An error occurred',
				status: response.status
			}

			try {
				const errorData = await response.json()
				error.message = errorData.message || error.message
			} catch {}

			throw error
		}

		return response.json()
	}

	async listDashboards(authorizedFetch: (url: string, options?: any) => Promise<Response>): Promise<Dashboard[]> {
		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards`)
		const data = await this.handleResponse<{ items: Dashboard[] }>(response)
		return data.items || []
	}

	async listLiteDashboards(
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<LiteDashboard[]> {
		const response = await authorizedFetch(`${AUTH_SERVER}/lite/dashboards`)
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

		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards?${searchParams.toString()}`)
		return this.handleResponse(response)
	}

	async getDashboard(
		id: string,
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const url = `${AUTH_SERVER}/dashboards/${id}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse<Dashboard>(response)
	}

	async createDashboard(
		data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
			aiGenerated?: Record<string, any> | null
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const { visibility, tags, description, aiGenerated, ...dashboardData } = data
		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				data: dashboardData,
				visibility: visibility || 'private',
				tags: tags || [],
				description: description || '',
				aiGenerated: aiGenerated || null
			})
		})

		return this.handleResponse<Dashboard>(response)
	}

	async updateDashboard(
		id: string,
		data: {
			items: DashboardItemConfig[]
			dashboardName: string
			timePeriod?: TimePeriod
			visibility?: 'private' | 'public'
			tags?: string[]
			description?: string
			aiGenerated?: Record<string, any> | null
		},
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const { visibility, tags, description, aiGenerated, ...dashboardData } = data
		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards/${id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				data: dashboardData,
				visibility: visibility || 'private',
				tags: tags || [],
				description: description || '',
				aiGenerated: aiGenerated || null
			})
		})

		return this.handleResponse<Dashboard>(response)
	}

	async deleteDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ message: string }> {
		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards/delete/${id}`, {
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

		const url = `${AUTH_SERVER}/dashboards/discover?${queryParams.toString()}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse(response)
	}

	async searchDashboards(
		params: {
			query?: string
			tags?: string[]
			visibility?: 'public' | 'private'
			sortBy?: 'popular' | 'recent' | 'likes'
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
		if (params.page) queryParams.append('page', params.page.toString())
		if (params.limit) queryParams.append('limit', params.limit.toString())

		const url = `${AUTH_SERVER}/dashboards/search?${queryParams.toString()}`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse(response)
	}

	async viewDashboard(
		id: string,
		authorizedFetch?: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const url = `${AUTH_SERVER}/dashboards/${id}/view`
		const response = authorizedFetch ? await authorizedFetch(url) : await fetch(url)
		return this.handleResponse<Dashboard>(response)
	}

	async likeDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ liked: boolean; likeCount: number }> {
		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards/${id}/like`, {
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

		const response = await authorizedFetch(`${AUTH_SERVER}/dashboards/liked?${searchParams}`)
		return this.handleResponse(response)
	}
}

export const dashboardAPI = new DashboardAPIService()
