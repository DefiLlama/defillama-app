import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
	confirmTelegramLink,
	getTelegramStatus,
	startTelegramLink,
	unlinkTelegram,
	type TelegramStatus
} from '~/containers/LlamaAI/api/telegram'
import { LLAMA_AI_SETTINGS_QUERY_KEY, type SettingsQueryResult } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useAuthContext } from '~/containers/Subscription/auth'

export const LLAMA_AI_TELEGRAM_STATUS_QUERY_KEY = ['llama-ai', 'telegram-status'] as const

export const getTelegramStatusQueryKey = (userId: string | null) =>
	[...LLAMA_AI_TELEGRAM_STATUS_QUERY_KEY, userId] as const

const POLL_MS = 2000

export type IntegrationLinkState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'linked'; username: string; linkedAt: string }
	| { status: 'starting' }
	| { status: 'awaiting_tg'; token: string; deepLink: string }
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

export type IntegrationLinkLocalState =
	| { status: 'idle' }
	| { status: 'awaiting_code'; token: string }
	| {
			status: 'switch_confirm'
			token: string
			short_code: string
			currentTelegramUsername: string | null
			expiresAt: string
	  }
	| { status: 'error'; message: string }

type IntegrationLinkSwitchConfirmState = Extract<IntegrationLinkLocalState, { status: 'switch_confirm' }>
type Options = { initialStatus?: TelegramStatus | null; initialTgloginToken?: string | null }
type ConfirmTelegramLinkResult = Awaited<ReturnType<typeof confirmTelegramLink>>
type ConfirmTelegramLinkVariables = { token: string; short_code: string; force?: boolean }

export function getTelegramStatusRefetchInterval(status: TelegramStatus | null | undefined) {
	return status?.pending ? POLL_MS : false
}

export function deriveTelegramLinkState({
	status,
	localState,
	isLoading,
	isStarting,
	isConfirming
}: {
	status: TelegramStatus | null | undefined
	localState: IntegrationLinkLocalState
	isLoading: boolean
	isStarting: boolean
	isConfirming: boolean
}): IntegrationLinkState {
	if (localState.status === 'error') return localState
	if (isStarting) return { status: 'starting' }
	if (isConfirming) return { status: 'confirming' }
	if (localState.status === 'awaiting_code' || localState.status === 'switch_confirm') return localState
	if (status?.pending) return { status: 'awaiting_tg', token: status.pending.token, deepLink: status.pending.deepLink }
	if (status?.link.state === 'linked') {
		return { status: 'linked', username: status.link.telegramUsername, linkedAt: status.link.linkedAt }
	}
	if (isLoading) return { status: 'loading' }
	return { status: 'idle' }
}

function getSwitchConfirmation(
	result: ConfirmTelegramLinkResult | undefined,
	variables: ConfirmTelegramLinkVariables | undefined
): IntegrationLinkSwitchConfirmState | null {
	if (!result || !('status' in result) || result.status !== 'requires_switch_confirmation' || !variables) return null
	return {
		status: 'switch_confirm',
		token: variables.token,
		short_code: variables.short_code,
		currentTelegramUsername: result.currentTelegramUsername,
		expiresAt: result.expiresAt
	}
}

function getMutationErrorState(
	error: Error | null,
	fallback: string
): Extract<IntegrationLinkLocalState, { status: 'error' }> | null {
	if (!error) return null
	return { status: 'error', message: error.message || fallback }
}

export function deriveTelegramLocalState({
	switchConfirmation,
	confirmLinked,
	initialTgloginToken,
	startError,
	unlinkError,
	confirmError,
	confirmWasForced,
	statusError,
	hasStatusData
}: {
	switchConfirmation: IntegrationLinkSwitchConfirmState | null
	confirmLinked: boolean
	initialTgloginToken: string | null | undefined
	startError: Error | null
	unlinkError: Error | null
	confirmError: Error | null
	confirmWasForced: boolean
	statusError: Error | null
	hasStatusData: boolean
}): IntegrationLinkLocalState {
	if (switchConfirmation) return switchConfirmation
	if (confirmLinked) return { status: 'idle' }

	const mutationError =
		(confirmWasForced ? getMutationErrorState(confirmError, 'Switch failed') : null) ??
		getMutationErrorState(startError, 'Failed to start linking') ??
		getMutationErrorState(unlinkError, 'Failed to unlink Telegram')
	if (mutationError) return mutationError

	if (initialTgloginToken) return { status: 'awaiting_code', token: initialTgloginToken }
	if (!hasStatusData) return getMutationErrorState(statusError, 'Failed to load Telegram status') ?? { status: 'idle' }
	return { status: 'idle' }
}

export function useIntegrationLink(opts: Options = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const queryClient = useQueryClient()
	const userId = user?.id ?? null
	const statusQueryKey = useMemo(() => getTelegramStatusQueryKey(userId), [userId])

	const cacheSettingsTelegramStatus = useCallback(
		(status: TelegramStatus) => {
			if (!userId) return
			queryClient.setQueryData<SettingsQueryResult>([...LLAMA_AI_SETTINGS_QUERY_KEY, userId], (previous) => ({
				settings: previous?.settings ?? null,
				availableModels: previous?.availableModels ?? [],
				availableEfforts: previous?.availableEfforts ?? [],
				telegramStatus: status,
				tip: previous?.tip ?? null
			}))
		},
		[queryClient, userId]
	)

	const cacheTelegramStatus = useCallback(
		(status: TelegramStatus) => {
			queryClient.setQueryData(statusQueryKey, status)
			cacheSettingsTelegramStatus(status)
		},
		[cacheSettingsTelegramStatus, queryClient, statusQueryKey]
	)

	const statusQuery = useQuery({
		queryKey: statusQueryKey,
		queryFn: async () => {
			const status = await getTelegramStatus(authorizedFetch)
			cacheSettingsTelegramStatus(status)
			return status
		},
		enabled: !!userId,
		initialData: opts.initialStatus ?? undefined,
		refetchInterval: (query) => getTelegramStatusRefetchInterval(query.state.data),
		refetchOnWindowFocus: false,
		staleTime: 30_000
	})

	const startMutation = useMutation({
		mutationFn: () => startTelegramLink(authorizedFetch),
		onSuccess: (result) => {
			const previous = queryClient.getQueryData<TelegramStatus>(statusQueryKey)
			const status: TelegramStatus = {
				link: previous?.link ?? { state: 'unlinked' },
				pending: { token: result.token, deepLink: result.deepLink, expiresAt: result.expiresAt }
			}
			cacheTelegramStatus(status)
			if (typeof window !== 'undefined') window.open(result.deepLink, '_blank', 'noopener')
		}
	})

	const unlinkMutation = useMutation({
		mutationFn: () => unlinkTelegram(authorizedFetch),
		onSuccess: () => {
			cacheTelegramStatus({ link: { state: 'unlinked' }, pending: null })
		}
	})

	const confirmMutation = useMutation({
		mutationFn: (variables: ConfirmTelegramLinkVariables) => confirmTelegramLink(authorizedFetch, variables),
		onSuccess: (result) => {
			if ('linked' in result && result.linked) {
				cacheTelegramStatus({
					link: {
						state: 'linked',
						telegramUsername: result.telegramUsername ?? '',
						linkedAt: new Date().toISOString()
					},
					pending: null
				})
			}
		}
	})

	const connect = useCallback(() => {
		startMutation.mutate()
	}, [startMutation])

	const disconnect = useCallback(() => {
		unlinkMutation.mutate()
	}, [unlinkMutation])

	const confirmCode = useCallback(
		async (short_code: string) => {
			if (!opts.initialTgloginToken) return
			return confirmMutation.mutateAsync({ token: opts.initialTgloginToken, short_code })
		},
		[confirmMutation, opts.initialTgloginToken]
	)

	const confirmSwitch = useCallback(async () => {
		const switchConfirmation = getSwitchConfirmation(confirmMutation.data, confirmMutation.variables)
		if (!switchConfirmation) return false
		const { token, short_code } = switchConfirmation
		try {
			await confirmMutation.mutateAsync({ token, short_code, force: true })
			return true
		} catch (error: any) {
			if (error?.status === 409 && error?.body?.error === 'link_state_changed') {
				confirmMutation.reset()
				await statusQuery.refetch()
				return true
			}
			return false
		}
	}, [confirmMutation, statusQuery])

	const cancelSwitch = useCallback(() => {
		confirmMutation.reset()
	}, [confirmMutation])

	const switchConfirmation = getSwitchConfirmation(confirmMutation.data, confirmMutation.variables)
	const localState = deriveTelegramLocalState({
		switchConfirmation,
		confirmLinked: !!(confirmMutation.data && 'linked' in confirmMutation.data && confirmMutation.data.linked),
		initialTgloginToken: opts.initialTgloginToken,
		startError: startMutation.error,
		unlinkError: unlinkMutation.error,
		confirmError: confirmMutation.error,
		confirmWasForced: !!confirmMutation.variables?.force,
		statusError: statusQuery.error,
		hasStatusData: !!statusQuery.data
	})

	const state = deriveTelegramLinkState({
		status: statusQuery.data,
		localState,
		isLoading: statusQuery.isLoading,
		isStarting: startMutation.isPending,
		isConfirming: confirmMutation.isPending
	})

	return { state, connect, disconnect, confirmCode, confirmSwitch, cancelSwitch }
}
