import { FEATURES_SERVER } from '~/constants'
import type {
	AuthorDashboardSort,
	AuthorPageResponse,
	AuthorProfileUpdate,
	PublicDashboardAuthor,
	TopAuthorEntry
} from './types'

type AuthorizedFetch = (url: string, options?: RequestInit) => Promise<Response | null>
type FetchLike = (url: string, options?: RequestInit) => Promise<Response | null>

export class AuthorApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'AuthorApiError'
		this.status = status
		Object.setPrototypeOf(this, AuthorApiError.prototype)
	}
}

function authorUrl(path: string) {
	return `${FEATURES_SERVER.replace(/\/$/, '')}${path}`
}

async function parseResponse<T>(response: Response | null): Promise<T> {
	if (!response) throw new AuthorApiError('Please sign in to continue', 401)
	const text = await response.text()
	const data = text ? JSON.parse(text) : null
	if (!response.ok) {
		const message =
			data && typeof data === 'object' && typeof data.error === 'string'
				? data.error
				: response.statusText || 'Author request failed'
		throw new AuthorApiError(message, response.status)
	}
	return data as T
}

export async function getAuthorBySlug(
	slug: string,
	params: { dashboardPage?: number; dashboardLimit?: number; dashboardSort?: AuthorDashboardSort } = {},
	fetcher: FetchLike = fetch
): Promise<AuthorPageResponse> {
	const searchParams = new URLSearchParams()
	if (params.dashboardPage) searchParams.set('dashboardPage', String(params.dashboardPage))
	if (params.dashboardLimit) searchParams.set('dashboardLimit', String(params.dashboardLimit))
	if (params.dashboardSort) searchParams.set('dashboardSort', params.dashboardSort)
	const qs = searchParams.toString()
	const response = await fetcher(authorUrl(`/authors/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`))
	return parseResponse<AuthorPageResponse>(response)
}

export async function getTopAuthors(limit?: number, fetcher: FetchLike = fetch): Promise<TopAuthorEntry[]> {
	const qs = limit ? `?limit=${limit}` : ''
	const response = await fetcher(authorUrl(`/authors/top${qs}`))
	const data = await parseResponse<{ items: TopAuthorEntry[] }>(response)
	return Array.isArray(data.items) ? data.items : []
}

export async function followAuthor(
	slug: string,
	authorizedFetch: AuthorizedFetch
): Promise<{ following: boolean; followerCount: number }> {
	const response = await authorizedFetch(authorUrl(`/authors/${encodeURIComponent(slug)}/follow`), {
		method: 'POST'
	})
	return parseResponse<{ following: boolean; followerCount: number }>(response)
}

export async function getMyDashboardAuthorProfile(authorizedFetch: AuthorizedFetch): Promise<PublicDashboardAuthor> {
	const response = await authorizedFetch(authorUrl('/authors/me'))
	const data = await parseResponse<{ author: PublicDashboardAuthor }>(response)
	return data.author
}

export async function updateMyDashboardAuthorProfile(
	payload: AuthorProfileUpdate,
	authorizedFetch: AuthorizedFetch
): Promise<PublicDashboardAuthor> {
	const response = await authorizedFetch(authorUrl('/authors/me'), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})
	const data = await parseResponse<{ author: PublicDashboardAuthor }>(response)
	return data.author
}
