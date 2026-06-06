import { llamaAIRequest, type AuthorizedFetch } from '~/containers/LlamaAI/api/transport'

export type TelegramStatusLink = { state: 'linked'; telegramUsername: string; linkedAt: string } | { state: 'unlinked' }
export type TelegramStatusPending = { token: string; deepLink: string; expiresAt: string }
export type TelegramStatus = { link: TelegramStatusLink; pending: TelegramStatusPending | null }

export const getTelegramStatus = (af: AuthorizedFetch) => llamaAIRequest<TelegramStatus>(af, '/telegram/status')

export const startTelegramLink = (af: AuthorizedFetch) =>
	llamaAIRequest<{ state: 'pending'; token: string; deepLink: string; expiresAt: string }>(af, '/telegram/link/start', {
		method: 'POST'
	})

export const confirmTelegramLink = (
	af: AuthorizedFetch,
	body: { token: string; short_code: string; force?: boolean }
) =>
	llamaAIRequest<
		| { linked: true; telegramUsername: string | null; switched: boolean }
		| { status: 'requires_switch_confirmation'; currentTelegramUsername: string | null; expiresAt: string }
	>(af, '/telegram/link/confirm', { method: 'POST', json: body })

export const unlinkTelegram = (af: AuthorizedFetch) =>
	llamaAIRequest<{ unlinked: true }>(af, '/telegram/link', { method: 'DELETE' })
