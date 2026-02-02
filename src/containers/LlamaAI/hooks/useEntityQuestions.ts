import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { MCP_SERVER } from '~/constants'
import type { EntityQuestionsResponse } from '../types'

/** Query key for entity-specific questions */
export const getEntityQuestionsQueryKey = (entitySlug: string, entityType: 'protocol' | 'chain') =>
	['entity-questions', entitySlug, entityType] as const

async function fetchEntityQuestions(
	entitySlug: string,
	entityType: 'protocol' | 'chain'
): Promise<EntityQuestionsResponse> {
	const response = await fetch(
		`${MCP_SERVER}/suggested-questions?entity=${encodeURIComponent(entitySlug)}&entityType=${encodeURIComponent(entityType)}`
	)
	if (!response.ok) {
		throw new Error('Failed to fetch entity questions')
	}
	return response.json()
}

export function useEntityQuestions(
	entitySlug: string | null,
	entityType: 'protocol' | 'chain' | null,
	enabled: boolean = true
): UseQueryResult<EntityQuestionsResponse> {
	return useQuery({
		queryKey: getEntityQuestionsQueryKey(entitySlug ?? '', entityType ?? 'protocol'),
		queryFn: () => fetchEntityQuestions(entitySlug!, entityType!),
		enabled: enabled && !!entitySlug && !!entityType,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})
}
