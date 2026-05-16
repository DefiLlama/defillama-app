import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
	getSlackStatus,
	listSlackWorkspaces,
	startSlackLink,
	unlinkSlackWorkspace,
	type SlackLink,
	type SlackStatus
} from '~/containers/LlamaAI/api/slack'
import { useAuthContext } from '~/containers/Subscription/auth'

export const LLAMA_AI_SLACK_STATUS_QUERY_KEY = ['llama-ai', 'slack-status'] as const

export const getSlackStatusQueryKey = (userId: string | null) => [...LLAMA_AI_SLACK_STATUS_QUERY_KEY, userId] as const

const POLL_MS = 2000

export type SlackIntegrationState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'starting' }
	| { status: 'pending'; expiresAt: string }
	| { status: 'linked'; workspaces: SlackLink[] }
	| { status: 'error'; message: string }

export function getSlackStatusRefetchInterval(status: SlackStatus | null | undefined) {
	return status?.pending ? POLL_MS : false
}

export function deriveSlackIntegrationState({
	status,
	isLoading,
	isStarting,
	startError,
	statusError
}: {
	status: SlackStatus | null | undefined
	isLoading: boolean
	isStarting: boolean
	startError: Error | null
	statusError: Error | null
}): SlackIntegrationState {
	if (startError) return { status: 'error', message: startError.message || 'Failed to start linking' }
	if (isStarting) return { status: 'starting' }
	if (status?.pending) return { status: 'pending', expiresAt: status.pending.expiresAt }
	if (status?.links && status.links.length > 0) return { status: 'linked', workspaces: status.links }
	if (isLoading) return { status: 'loading' }
	if (statusError) return { status: 'error', message: statusError.message || 'Failed to load Slack status' }
	return { status: 'idle' }
}

type Options = { initialStatus?: SlackStatus | null }

export function useSlackIntegrationLink(opts: Options = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const queryClient = useQueryClient()
	const userId = user?.id ?? null
	const statusQueryKey = useMemo(() => getSlackStatusQueryKey(userId), [userId])

	const statusQuery = useQuery({
		queryKey: statusQueryKey,
		queryFn: () => getSlackStatus(authorizedFetch),
		enabled: !!userId,
		initialData: opts.initialStatus ?? undefined,
		refetchInterval: (query) => getSlackStatusRefetchInterval(query.state.data),
		refetchOnWindowFocus: true,
		staleTime: 30_000
	})

	const startMutation = useMutation({
		mutationFn: async () => {
			const returnTo = typeof window !== 'undefined' ? window.location.href : undefined
			return startSlackLink(authorizedFetch, returnTo ? { return_to: returnTo } : undefined)
		},
		onSuccess: (result) => {
			const previous = queryClient.getQueryData<SlackStatus>(statusQueryKey)
			queryClient.setQueryData<SlackStatus>(statusQueryKey, {
				links: previous?.links ?? [],
				pending: { expiresAt: result.expiresAt }
			})
			if (typeof window !== 'undefined') {
				window.location.href = result.authorizeUrl
			}
		}
	})

	const unlinkMutation = useMutation({
		mutationFn: (teamId: string) => unlinkSlackWorkspace(authorizedFetch, teamId),
		onSuccess: (_data, teamId) => {
			const previous = queryClient.getQueryData<SlackStatus>(statusQueryKey)
			queryClient.setQueryData<SlackStatus>(statusQueryKey, {
				links: (previous?.links ?? []).filter((w) => w.team_id !== teamId),
				pending: previous?.pending ?? null
			})
		}
	})

	const connect = useCallback(() => {
		startMutation.mutate()
	}, [startMutation])

	const disconnect = useCallback(
		(teamId: string) => {
			unlinkMutation.mutate(teamId)
		},
		[unlinkMutation]
	)

	const state = deriveSlackIntegrationState({
		status: statusQuery.data,
		isLoading: statusQuery.isLoading,
		isStarting: startMutation.isPending,
		startError: startMutation.error,
		statusError: statusQuery.error
	})

	return { state, connect, disconnect, isDisconnecting: unlinkMutation.isPending }
}

export function useSlackWorkspaces() {
	const { authorizedFetch, user } = useAuthContext()
	const userId = user?.id ?? null

	return useQuery({
		queryKey: ['llama-ai', 'slack-workspaces', userId],
		queryFn: () => listSlackWorkspaces(authorizedFetch),
		enabled: !!userId,
		staleTime: 60_000,
		refetchOnWindowFocus: true
	})
}
