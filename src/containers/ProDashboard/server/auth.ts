import type { IncomingMessage } from 'http'

export function getAuthTokenFromRequest(req: IncomingMessage & { cookies?: Record<string, string> }): string | null {
	return req.cookies?.['pb_auth_token'] || null
}

export function createServerAuthorizedFetch(token: string) {
	return async (url: string, options: RequestInit = {}): Promise<Response> => {
		return fetch(url, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${token}`
			}
		})
	}
}
