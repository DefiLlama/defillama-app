import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { AI_SERVER } from '~/constants'
import {
	LLAMA_AI_SETTINGS_QUERY_KEY,
	useLlamaAISettings,
	type SettingsQueryResult,
	type TipDTO
} from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useAuthContext } from '~/containers/Subscription/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const seenTipIds = new Set<string>()
type TipMutationKind = 'seen' | 'dismiss' | 'click'
type TipMutationInput = { tipId: string; kind: TipMutationKind }

export function useActiveTip(): {
	tip: TipDTO | null
	markSeen: (tip: TipDTO) => void
	dismissTip: (tip: TipDTO) => Promise<void>
	clickTip: (tip: TipDTO, action: string) => Promise<void>
} {
	const { tip } = useLlamaAISettings()
	const queryClient = useQueryClient()
	const { authorizedFetch } = useAuthContext()

	const clearTipInCache = useCallback(() => {
		queryClient.setQueriesData({ queryKey: LLAMA_AI_SETTINGS_QUERY_KEY }, (old?: SettingsQueryResult | null) =>
			old ? { ...old, tip: null } : old
		)
	}, [queryClient])

	const { mutate: postTip, mutateAsync: postTipAsync } = useMutation({
		mutationFn: async ({ tipId, kind }: TipMutationInput) => {
			if (!authorizedFetch) throw new Error('Cannot update LlamaAI tip without an authenticated fetch client')
			const response = await authorizedFetch(`${AI_SERVER}/user-tips/${encodeURIComponent(tipId)}/${kind}`, {
				method: 'POST'
			})
			if (!response?.ok) throw new Error(`Failed to update LlamaAI tip ${kind}`)
		}
	})

	const markSeen = useCallback(
		(t: TipDTO) => {
			if (seenTipIds.has(t.id)) return
			seenTipIds.add(t.id)
			trackUmamiEvent('llamaai-tip-impression', { tipId: t.id, variant: t.variant, family: t.family })
			postTip(
				{ tipId: t.id, kind: 'seen' },
				{
					onError: (error) => {
						console.error('Failed to mark LlamaAI tip as seen', error)
					}
				}
			)
		},
		[postTip]
	)

	const dismissTip = useCallback(
		async (t: TipDTO) => {
			trackUmamiEvent('llamaai-tip-dismiss', { tipId: t.id, variant: t.variant, family: t.family })
			try {
				await postTipAsync({ tipId: t.id, kind: 'dismiss' })
				clearTipInCache()
			} catch (error) {
				console.error('Failed to dismiss LlamaAI tip', error)
			}
		},
		[clearTipInCache, postTipAsync]
	)

	const clickTip = useCallback(
		async (t: TipDTO, action: string) => {
			trackUmamiEvent('llamaai-tip-click', { tipId: t.id, variant: t.variant, family: t.family, action })
			try {
				await postTipAsync({ tipId: t.id, kind: 'click' })
				clearTipInCache()
			} catch (error) {
				console.error('Failed to record LlamaAI tip click', error)
			}
		},
		[clearTipInCache, postTipAsync]
	)

	useEffect(() => {
		if (!tip) return
		markSeen(tip)
	}, [tip, markSeen])

	return { tip, markSeen, dismissTip, clickTip }
}
