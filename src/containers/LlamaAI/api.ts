import { MCP_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'
import { EntityQuestionsResponse } from './types'

export async function fetchEntityQuestions(
	entitySlug: string,
	entityType: 'protocol' | 'chain' | 'page',
	context?: Record<string, any>
): Promise<EntityQuestionsResponse> {
	try {
		if (context) {
			const res = await fetch(`${MCP_SERVER}/suggested-questions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entity: entitySlug, entityType, context })
			})
			if (!res.ok) return { questions: [], suggestGlobal: false }
			return await res.json()
		}
		const data = await fetchJson<EntityQuestionsResponse>(
			`${MCP_SERVER}/suggested-questions?entity=${encodeURIComponent(entitySlug)}&entityType=${encodeURIComponent(entityType)}`
		)
		return data
	} catch {
		return { questions: [], suggestGlobal: false }
	}
}
