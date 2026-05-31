import { useQueryClient } from '@tanstack/react-query'
import type { NextRouter } from 'next/router'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { consumeSlackLogin } from '~/containers/LlamaAI/api/slack'
import { LLAMA_AI_SLACK_STATUS_QUERY_KEY } from '~/containers/LlamaAI/hooks/useSlackIntegrationLink'
import {
	getSettingsIntentFromQuery,
	readPendingSettingsIntent,
	stashSettingsIntent,
	type SettingsInitialState,
	type SlackResult
} from '~/containers/LlamaAI/utils/settingsIntent'
import { useAuthContext } from '~/containers/Subscription/auth'

function emitSlackToast(result: SlackResult, teamName: string | null, detail: string | null) {
	switch (result) {
		case 'connected':
			toast.success(teamName ? `Connected to ${teamName} on Slack` : 'Slack workspace connected')
			break
		case 'link_expired':
			toast.error('Slack link expired. Try connecting again from Settings.')
			break
		case 'slack_failed':
			toast.error(`Slack rejected the connection: ${detail ?? 'unknown error'}`)
			break
		case 'approval_pending':
			toast('Awaiting workspace admin approval. Once they approve LlamaAI, click Connect again from Settings.', {
				icon: '⏳',
				duration: 8000
			})
			break
		case 'enterprise_not_supported':
			toast.error('Slack Enterprise Grid workspaces are not supported yet.')
			break
		case 'invalid_request':
		case 'internal_error':
			toast.error('Something went wrong connecting to Slack. Try again.')
			break
	}
}

type SettingsDialogStore = { show: () => void }

/** @internal Exported for the route-intent unit test. */
export function shouldConsumeSlackLoginToken(lastConsumedToken: string | null, nextToken: string | null | undefined) {
	return !!nextToken && lastConsumedToken !== nextToken
}

export function useSettingsRouteIntent({
	router,
	user,
	settingsModalStore,
	setInitialIntegrationsState
}: {
	router: NextRouter
	user: unknown
	settingsModalStore: SettingsDialogStore
	setInitialIntegrationsState: (state: SettingsInitialState | null) => void
}) {
	const { isReady, pathname, query, replace } = router
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const consumedSlackLoginTokenRef = useRef<string | null>(null)
	const openSettingsIntent = useCallback(
		(initialState: SettingsInitialState) => {
			if (initialState.slackResult) {
				emitSlackToast(
					initialState.slackResult,
					initialState.slackTeamName ?? null,
					initialState.slackErrorDetail ?? null
				)
				if (initialState.slackResult === 'connected') {
					void queryClient.invalidateQueries({ queryKey: LLAMA_AI_SLACK_STATUS_QUERY_KEY })
					void queryClient.invalidateQueries({ queryKey: ['llama-ai', 'slack-workspaces'] })
				}
			}
			const slackloginToken = initialState.slackloginToken
			if (shouldConsumeSlackLoginToken(consumedSlackLoginTokenRef.current, slackloginToken)) {
				consumedSlackLoginTokenRef.current = slackloginToken
				void consumeSlackLogin(authorizedFetch, slackloginToken)
					.then(() => {
						toast.success('Slack account connected')
						void queryClient.invalidateQueries({ queryKey: LLAMA_AI_SLACK_STATUS_QUERY_KEY })
						void queryClient.invalidateQueries({ queryKey: ['llama-ai', 'slack-workspaces'] })
					})
					.catch((error) => {
						const message =
							error?.message === 'slack_login_expired'
								? 'Slack login link expired. Ask LlamaAI for a new link.'
								: 'Failed to connect Slack account.'
						toast.error(message)
					})
			}
			if (initialState.tab || initialState.tgloginToken || initialState.slackloginToken || initialState.slackResult)
				setInitialIntegrationsState(initialState)
			settingsModalStore.show()
		},
		[authorizedFetch, queryClient, setInitialIntegrationsState, settingsModalStore]
	)

	useEffect(() => {
		if (!isReady) return
		const intent = getSettingsIntentFromQuery(query)
		if (!intent) return

		void replace({ pathname, query: intent.nextQuery }, undefined, {
			shallow: true,
			scroll: false
		})

		if (!user) {
			try {
				stashSettingsIntent(window.sessionStorage, intent.initialState)
			} catch {}
			return
		}

		openSettingsIntent(intent.initialState)
	}, [isReady, openSettingsIntent, pathname, query, replace, user])

	useEffect(() => {
		if (!user) return
		let intent: SettingsInitialState | null = null
		try {
			intent = readPendingSettingsIntent(window.sessionStorage)
		} catch {}
		if (intent) openSettingsIntent(intent)
	}, [openSettingsIntent, user])
}
