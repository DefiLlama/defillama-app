import { useQuery } from '@tanstack/react-query'
import { MCP_SERVER } from '~/constants'
import type { SuggestedQuestionsResponse } from '../types'

async function fetchSuggestedQuestions(): Promise<SuggestedQuestionsResponse> {
	const response = await fetch(`${MCP_SERVER}/suggested-questions`)
	if (!response.ok) {
		throw new Error('Failed to fetch suggested questions')
	}
	return response.json()
}

export function useSuggestedQuestions(enabled: boolean = true) {
	return useQuery({
		queryKey: ['suggested-questions'],
		queryFn: fetchSuggestedQuestions,
		enabled,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})
}
