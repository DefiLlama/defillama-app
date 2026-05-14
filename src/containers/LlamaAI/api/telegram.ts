import { AI_SERVER } from '~/constants'

type FetchOptions = { method?: 'GET' | 'POST' | 'DELETE'; headers?: Record<string, string>; body?: string }
export type AuthorizedFetch = (url: string, options?: FetchOptions, onlyToken?: boolean) => Promise<Response | null>

export type TelegramStatusLink = { state: 'linked'; telegramUsername: string; linkedAt: string } | { state: 'unlinked' }
export type TelegramStatusPending = { token: string; deepLink: string; expiresAt: string }
export type TelegramStatus = { link: TelegramStatusLink; pending: TelegramStatusPending | null }

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
	return res.json()
}

export const getTelegramStatus = (af: AuthorizedFetch) => req<TelegramStatus>(af, '/telegram/status')

export const startTelegramLink = (af: AuthorizedFetch) =>
	req<{ state: 'pending'; token: string; deepLink: string; expiresAt: string }>(af, '/telegram/link/start', {
		method: 'POST'
	})

export const confirmTelegramLink = (
	af: AuthorizedFetch,
	body: { token: string; short_code: string; force?: boolean }
) =>
	req<
		| { linked: true; telegramUsername: string | null; switched: boolean }
		| { status: 'requires_switch_confirmation'; currentTelegramUsername: string | null; expiresAt: string }
	>(af, '/telegram/link/confirm', { method: 'POST', body })

export const unlinkTelegram = (af: AuthorizedFetch) =>
	req<{ unlinked: true }>(af, '/telegram/link', { method: 'DELETE' })
