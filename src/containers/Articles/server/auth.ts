import type { IncomingMessage } from 'http'
import type { FetchLike } from '~/containers/Articles/api'
import { createServerAuthorizedFetch, getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'

export function getArticlesFetchFromRequest(
	req: IncomingMessage & { cookies?: Record<string, string> }
): FetchLike | null {
	const token = getAuthTokenFromRequest(req)
	if (!token) return null
	return createServerAuthorizedFetch(token)
}
