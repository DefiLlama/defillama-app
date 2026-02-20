import { MCP_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'
import { EntityQuestionsResponse } from './types'

export async function fetchEntityQuestions(
	entitySlug: string,
	entityType: 'protocol' | 'chain'
): Promise<EntityQuestionsResponse> {
	try {
		const data = await fetchJson<EntityQuestionsResponse>(
			`${MCP_SERVER}/suggested-questions?entity=${encodeURIComponent(entitySlug)}&entityType=${encodeURIComponent(entityType)}`
		)
		return { questions: data.questions ?? [], suggestGlobal: data.suggestGlobal ?? false }
	} catch {
		return { questions: [], suggestGlobal: false } // Fail silently - no questions is fine
	}
}
