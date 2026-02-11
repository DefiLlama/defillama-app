import { MCP_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { EntityQuestionsResponse } from './types'

export async function fetchEntityQuestions(
	entitySlug: string,
	entityType: 'protocol' | 'chain' | 'page',
	context?: Record<string, any>
): Promise<EntityQuestionsResponse> {
	try {
		if (context) {
			const res = await fetchJson(`${MCP_SERVER}/suggested-questions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entity: entitySlug, entityType, context })
			})
			return res
		}
		const data = await fetchJson<EntityQuestionsResponse>(
			`${MCP_SERVER}/suggested-questions?entity=${encodeURIComponent(entitySlug)}&entityType=${encodeURIComponent(entityType)}`
		)
		return data
	} catch {
		return { questions: [], suggestGlobal: false }
	}
}
