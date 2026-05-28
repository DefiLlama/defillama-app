import { llamaAIRequest, type AuthorizedFetch } from '~/containers/LlamaAI/api/transport'

export type SlackLink = {
	team_id: string
	team_name: string
	default_channel_id: string | null
	default_channel_name: string | null
	installed_at: string
	revoked: boolean
	last_error: string | null
	scopes?: string
	needs_reconnect?: boolean
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

export type SlackLinkCancelResponse = {
	canceled: number
}

export type SlackLoginConsumeResponse = {
	ok: true
	team_id: string
	slack_user_id: string
}

export const getSlackStatus = (af: AuthorizedFetch) => llamaAIRequest<SlackStatus>(af, '/slack/status')

export const startSlackLink = (af: AuthorizedFetch, body?: { return_to?: string }) =>
	llamaAIRequest<SlackLinkStartResponse>(af, '/slack/link/start', { method: 'POST', json: body ?? {} })

export const cancelSlackLink = (af: AuthorizedFetch) =>
	llamaAIRequest<SlackLinkCancelResponse>(af, '/slack/link/cancel', { method: 'POST', json: {} })

export const consumeSlackLogin = (af: AuthorizedFetch, token: string) =>
	llamaAIRequest<SlackLoginConsumeResponse>(af, '/slack/login/consume', { method: 'POST', json: { token } })

export const listSlackWorkspaces = (af: AuthorizedFetch) =>
	llamaAIRequest<{ workspaces: SlackLink[] }>(af, '/slack/workspaces')

export const listSlackChannels = (af: AuthorizedFetch, teamId: string) =>
	llamaAIRequest<{ channels: SlackChannel[] }>(af, `/slack/channels?team_id=${encodeURIComponent(teamId)}`)

export const unlinkSlackWorkspace = (af: AuthorizedFetch, teamId: string) =>
	llamaAIRequest<{ unlinked: true }>(af, `/slack/links/${encodeURIComponent(teamId)}`, { method: 'DELETE' })
