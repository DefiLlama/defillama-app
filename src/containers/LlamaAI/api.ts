import { MCP_SERVER } from '~/constants'

export interface EntityQuestionsResponse {
	questions: string[]
	suggestGlobal: boolean
	entityNotFound?: boolean
}

export async function fetchEntityQuestions(
	entitySlug: string,
	entityType: 'protocol' | 'chain'
): Promise<string[]> {
	try {
		const res = await fetch(
			`${MCP_SERVER}/suggested-questions?entity=${encodeURIComponent(entitySlug)}&entityType=${encodeURIComponent(entityType)}`
		)
		if (!res.ok) return []
		const data: EntityQuestionsResponse = await res.json()
		return data.questions || []
	} catch {
		return [] // Fail silently - no questions is fine
	}
}
