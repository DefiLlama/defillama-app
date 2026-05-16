import { AI_SERVER } from '~/constants'

type FetchOptions = { method?: 'GET' | 'POST' | 'DELETE'; headers?: Record<string, string>; body?: string }
export type AuthorizedFetch = (url: string, options?: FetchOptions, onlyToken?: boolean) => Promise<Response | null>

export type SlackLink = {
	team_id: string
	team_name: string
	default_channel_id: string | null
	default_channel_name: string | null
	installed_at: string
	revoked: boolean
	last_error: string | null
}

export type SlackChannel = {
	id: string
	name: string
	is_private: boolean
	is_member: boolean
	is_archived: boolean
	num_members?: number
}

export type SlackPending = { expiresAt: string }

export type SlackStatus = { links: SlackLink[]; pending: SlackPending | null }

export type SlackLinkStartResponse = {
	state: 'pending'
	authorizeUrl: string
	expiresAt: string
}

async function req<T>(
	authorizedFetch: AuthorizedFetch,
	path: string,
	opts: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
	const headers: Record<string, string> = opts.body ? { 'Content-Type': 'application/json' } : {}
	const res = await authorizedFetch(`${AI_SERVER}${path}`, {
		method: opts.method || 'GET',
		headers,
		body: opts.body ? JSON.stringify(opts.body) : undefined
	})
	if (!res) {
		const e = new Error('unauthenticated') as Error & { status: number; body: any }
		e.status = 401
		e.body = { error: 'unauthenticated' }
		throw e
	}
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }))
		const e = new Error(err.error || res.statusText) as Error & { status: number; body: any }
		e.status = res.status
		e.body = err
		throw e
	}
	const contentLength = res.headers.get('content-length')
	const contentType = res.headers.get('content-type') ?? ''
	if (res.status === 204 || contentLength === '0' || !/(^|[/+])json($|;)/i.test(contentType)) {
		return null as T
	}
	return res.json()
}

export const getSlackStatus = (af: AuthorizedFetch) => req<SlackStatus>(af, '/slack/status')

export const startSlackLink = (af: AuthorizedFetch, body?: { return_to?: string }) =>
	req<SlackLinkStartResponse>(af, '/slack/link/start', { method: 'POST', body: body ?? {} })

export const listSlackWorkspaces = (af: AuthorizedFetch) => req<{ workspaces: SlackLink[] }>(af, '/slack/workspaces')

export const listSlackChannels = (af: AuthorizedFetch, teamId: string) =>
	req<{ channels: SlackChannel[] }>(af, `/slack/channels?team_id=${encodeURIComponent(teamId)}`)

export const unlinkSlackWorkspace = (af: AuthorizedFetch, teamId: string) =>
	req<{ unlinked: true }>(af, `/slack/links/${encodeURIComponent(teamId)}`, { method: 'DELETE' })
