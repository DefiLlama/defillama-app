import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { AI_SERVER } from '~/constants'
import {
	LLAMA_AI_SETTINGS_QUERY_KEY,
	useLlamaAISettings,
	type TipDTO
} from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useAuthContext } from '~/containers/Subscription/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'

export function useActiveTip(): {
	tip: TipDTO | null
	markSeen: (tip: TipDTO) => void
	dismissTip: (tip: TipDTO) => void
	clickTip: (tip: TipDTO, action: string) => void
} {
	const { tip } = useLlamaAISettings()
	const queryClient = useQueryClient()
	const { authorizedFetch } = useAuthContext()
	const seenRef = useRef<Set<string>>(new Set())

	const clearTipInCache = useCallback(() => {
		queryClient.setQueriesData({ queryKey: LLAMA_AI_SETTINGS_QUERY_KEY }, (old: any) =>
			old ? { ...old, tip: null } : old
		)
	}, [queryClient])

	const post = useCallback(
		(tipId: string, kind: 'seen' | 'dismiss' | 'click') => {
			if (!authorizedFetch) return
			void authorizedFetch(`${AI_SERVER}/user-tips/${encodeURIComponent(tipId)}/${kind}`, {
				method: 'POST'
			}).catch(() => {})
		},
		[authorizedFetch]
	)

	const markSeen = useCallback(
		(t: TipDTO) => {
			if (seenRef.current.has(t.id)) return
			seenRef.current.add(t.id)
			trackUmamiEvent('llamaai-tip-impression', { tipId: t.id, variant: t.variant, family: t.family })
			post(t.id, 'seen')
		},
		[post]
	)

	const dismissTip = useCallback(
		(t: TipDTO) => {
			trackUmamiEvent('llamaai-tip-dismiss', { tipId: t.id, variant: t.variant, family: t.family })
			clearTipInCache()
			post(t.id, 'dismiss')
		},
		[clearTipInCache, post]
	)

	const clickTip = useCallback(
		(t: TipDTO, action: string) => {
			trackUmamiEvent('llamaai-tip-click', { tipId: t.id, variant: t.variant, family: t.family, action })
			clearTipInCache()
			post(t.id, 'click')
		},
		[clearTipInCache, post]
	)

	useEffect(() => {
		if (tip) markSeen(tip)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tip?.id])

	return { tip, markSeen, dismissTip, clickTip }
}
