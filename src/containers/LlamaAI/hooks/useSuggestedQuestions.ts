import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { AI_SERVER } from '~/constants'
import type { SuggestedQuestionsResponse } from '~/containers/LlamaAI/types'

/** Query key for suggested questions - use for cache invalidation */
const SUGGESTED_QUESTIONS_QUERY_KEY = ['suggested-questions'] as const

async function fetchSuggestedQuestions(): Promise<SuggestedQuestionsResponse> {
	const response = await fetch(`${AI_SERVER}/suggested-questions`)
	if (!response.ok) {
		throw new Error('Failed to fetch suggested questions')
	}
	return response.json()
}

export function useSuggestedQuestions(enabled: boolean = true): UseQueryResult<SuggestedQuestionsResponse> {
	return useQuery({
		queryKey: SUGGESTED_QUESTIONS_QUERY_KEY,
		queryFn: fetchSuggestedQuestions,
		enabled,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})
}
