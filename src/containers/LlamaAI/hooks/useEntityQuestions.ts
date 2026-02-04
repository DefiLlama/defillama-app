import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchEntityQuestions } from '../api'
import type { EntityQuestionsResponse } from '../types'

/** Query key for entity-specific questions */
const getEntityQuestionsQueryKey = (entitySlug: string, entityType: 'protocol' | 'chain') =>
	['entity-questions', entitySlug, entityType] as const

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
