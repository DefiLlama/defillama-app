import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	confirmTelegramLink,
	getTelegramStatus,
	startTelegramLink,
	unlinkTelegram,
	type TelegramStatus
} from '~/containers/LlamaAI/api/telegram'
import { LLAMA_AI_SETTINGS_QUERY_KEY, type SettingsQueryResult } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useAuthContext } from '~/containers/Subscription/auth'

export type IntegrationLinkState =
	| { status: 'idle' }
	| { status: 'linked'; username: string; linkedAt: string }
	| { status: 'starting' }
	| { status: 'awaiting_tg'; token: string; deepLink: string; pollSince: number; showFallback: boolean }
	| { status: 'awaiting_code'; token: string }
	| { status: 'confirming' }
	| {
			status: 'switch_confirm'
			token: string
			short_code: string
			currentTelegramUsername: string | null
			expiresAt: string
	  }
	| { status: 'error'; message: string }

type Options = { initialStatus?: TelegramStatus | null; initialTgloginToken?: string | null }

const POLL_MS = 2000
const FALLBACK_AFTER_MS = 60_000

export function useIntegrationLink(opts: Options = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const queryClient = useQueryClient()
	const initialTokenRef = useRef(opts.initialTgloginToken ?? null)
	const initialStatusRef = useRef(opts.initialStatus ?? null)
	const [state, setState] = useState<IntegrationLinkState>({ status: 'idle' })
	const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const lastShortCodeRef = useRef<string>('')

	const stopPolling = () => {
		if (pollTimerRef.current) {
			clearTimeout(pollTimerRef.current)
			pollTimerRef.current = null
		}
	}

	const renderFromStatus = useCallback((s: TelegramStatus) => {
		if (s.link.state === 'linked' && s.pending) {
			setState({
				status: 'awaiting_tg',
				token: s.pending.token,
				deepLink: s.pending.deepLink,
				pollSince: Date.now(),
				showFallback: false
			})
		} else if (s.link.state === 'linked') {
			setState({ status: 'linked', username: s.link.telegramUsername, linkedAt: s.link.linkedAt })
		} else if (s.pending) {
			setState({
				status: 'awaiting_tg',
				token: s.pending.token,
				deepLink: s.pending.deepLink,
				pollSince: Date.now(),
				showFallback: false
			})
		} else {
			setState({ status: 'idle' })
		}
	}, [])

	const cacheTelegramStatus = useCallback(
		(status: TelegramStatus) => {
			if (!user?.id) return
			queryClient.setQueryData<SettingsQueryResult>([...LLAMA_AI_SETTINGS_QUERY_KEY, user.id], (previous) => ({
				settings: previous?.settings ?? null,
				availableModels: previous?.availableModels ?? [],
				availableEfforts: previous?.availableEfforts ?? [],
				telegramStatus: status,
				tip: previous?.tip ?? null
			}))
		},
		[queryClient, user?.id]
	)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				if (initialTokenRef.current) {
					setState({ status: 'awaiting_code', token: initialTokenRef.current })
					return
				}
				if (initialStatusRef.current) {
					renderFromStatus(initialStatusRef.current)
					return
				}
				const s = await getTelegramStatus(authorizedFetch)
				if (cancelled) return
				cacheTelegramStatus(s)
				renderFromStatus(s)
			} catch (e: any) {
				if (!cancelled) setState({ status: 'error', message: e?.message || 'Failed to load Telegram status' })
			}
		})()
		return () => {
			cancelled = true
			stopPolling()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const connect = useCallback(async () => {
		setState({ status: 'starting' })
		try {
			const r = await startTelegramLink(authorizedFetch)
			window.open(r.deepLink, '_blank', 'noopener')
			cacheTelegramStatus({
				link:
					state.status === 'linked'
						? { state: 'linked', telegramUsername: state.username, linkedAt: state.linkedAt }
						: { state: 'unlinked' },
				pending: { token: r.token, deepLink: r.deepLink, expiresAt: r.expiresAt }
			})
			setState({
				status: 'awaiting_tg',
				token: r.token,
				deepLink: r.deepLink,
				pollSince: Date.now(),
				showFallback: false
			})
		} catch (e: any) {
			setState({ status: 'error', message: e?.message || 'Failed to start linking' })
		}
	}, [authorizedFetch, cacheTelegramStatus, state])

	const disconnect = useCallback(async () => {
		try {
			await unlinkTelegram(authorizedFetch)
			cacheTelegramStatus({ link: { state: 'unlinked' }, pending: null })
			setState({ status: 'idle' })
		} catch (e: any) {
			setState({ status: 'error', message: e?.message || 'Failed to unlink Telegram' })
		}
	}, [authorizedFetch, cacheTelegramStatus])

	useEffect(() => {
		if (state.status !== 'awaiting_tg') return
		const tick = async () => {
			try {
				const s = await getTelegramStatus(authorizedFetch)
				cacheTelegramStatus(s)
				if (s.link.state === 'linked') {
					setState({ status: 'linked', username: s.link.telegramUsername, linkedAt: s.link.linkedAt })
					return
				}
				if (Date.now() - state.pollSince > FALLBACK_AFTER_MS) {
					setState((prev) => (prev.status === 'awaiting_tg' ? { ...prev, showFallback: true } : prev))
				}
				pollTimerRef.current = setTimeout(tick, POLL_MS)
			} catch {
				pollTimerRef.current = setTimeout(tick, POLL_MS)
			}
		}
		pollTimerRef.current = setTimeout(tick, POLL_MS)
		return () => stopPolling()
	}, [state.status, (state as any).pollSince, authorizedFetch, cacheTelegramStatus])

	const confirmCode = useCallback(
		async (short_code: string) => {
			if (state.status !== 'awaiting_code') return
			lastShortCodeRef.current = short_code
			const token = state.token
			setState({ status: 'confirming' })
			try {
				const r = await confirmTelegramLink(authorizedFetch, { token, short_code })
				if ('linked' in r && r.linked) {
					const linkedAt = new Date().toISOString()
					cacheTelegramStatus({
						link: { state: 'linked', telegramUsername: r.telegramUsername ?? '', linkedAt },
						pending: null
					})
					setState({
						status: 'linked',
						username: r.telegramUsername ?? '',
						linkedAt
					})
				} else if ('status' in r && r.status === 'requires_switch_confirmation') {
					setState({
						status: 'switch_confirm',
						token,
						short_code,
						currentTelegramUsername: r.currentTelegramUsername,
						expiresAt: r.expiresAt
					})
				}
			} catch (e: any) {
				setState({ status: 'awaiting_code', token })
				throw e
			}
		},
		[state, authorizedFetch, cacheTelegramStatus]
	)

	const confirmSwitch = useCallback(async () => {
		if (state.status !== 'switch_confirm') return
		const { token, short_code } = state
		setState({ status: 'confirming' })
		try {
			const r = await confirmTelegramLink(authorizedFetch, { token, short_code, force: true })
			if ('linked' in r && r.linked) {
				const linkedAt = new Date().toISOString()
				cacheTelegramStatus({
					link: { state: 'linked', telegramUsername: r.telegramUsername ?? '', linkedAt },
					pending: null
				})
				setState({
					status: 'linked',
					username: r.telegramUsername ?? '',
					linkedAt
				})
			}
		} catch (e: any) {
			if (e?.status === 409 && e?.body?.error === 'link_state_changed') {
				const s = await getTelegramStatus(authorizedFetch).catch(() => null)
				if (s) {
					cacheTelegramStatus(s)
					renderFromStatus(s)
				}
			} else {
				setState({ status: 'error', message: e?.message || 'Switch failed' })
			}
		}
	}, [state, authorizedFetch, renderFromStatus, cacheTelegramStatus])

	const cancelSwitch = useCallback(() => {
		setState({ status: 'idle' })
	}, [])

	return { state, connect, disconnect, confirmCode, confirmSwitch, cancelSwitch }
}
