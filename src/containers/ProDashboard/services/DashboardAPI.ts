import { DashboardItemConfig } from '../types'

const DASHBOARDS_API_BASE = 'https://auth.llama.fi'

export interface Dashboard {
	id: string
	user: string
	data: {
		items: DashboardItemConfig[]
		dashboardName: string
	}
	created: string
	updated: string
	collectionId?: string
	collectionName?: string
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
		const response = await authorizedFetch(`${DASHBOARDS_API_BASE}/dashboards`)
		const data = await this.handleResponse<{ items: Dashboard[] }>(response)
		return data.items || []
	}

	async getDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const response = await authorizedFetch(`${DASHBOARDS_API_BASE}/dashboards/${id}`)
		return this.handleResponse<Dashboard>(response)
	}

	async createDashboard(
		data: { items: DashboardItemConfig[]; dashboardName: string },
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const response = await authorizedFetch(`${DASHBOARDS_API_BASE}/dashboards`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ data })
		})

		return this.handleResponse<Dashboard>(response)
	}

	async updateDashboard(
		id: string,
		data: { items: DashboardItemConfig[]; dashboardName: string },
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<Dashboard> {
		const response = await authorizedFetch(`${DASHBOARDS_API_BASE}/dashboards/${id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ data })
		})

		return this.handleResponse<Dashboard>(response)
	}

	async deleteDashboard(
		id: string,
		authorizedFetch: (url: string, options?: any) => Promise<Response>
	): Promise<{ message: string }> {
		const response = await authorizedFetch(`${DASHBOARDS_API_BASE}/dashboards/delete/${id}`, {
			method: 'POST'
		})

		return this.handleResponse<{ message: string }>(response)
	}
}

export const dashboardAPI = new DashboardAPIService()
