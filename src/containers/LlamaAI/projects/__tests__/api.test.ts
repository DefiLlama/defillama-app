import { describe, expect, it } from 'vitest'
import type { AuthorizedFetch } from '~/containers/LlamaAI/api/transport'
import { listProjectSessions, listProjects } from '~/containers/LlamaAI/projects/api'

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	})
}

describe('project API wrappers', () => {
	it('returns typed envelope fields directly', async () => {
		const projects = [{ id: 'project-1', name: 'Project', created_at: '2026-01-01T00:00:00.000Z' }]
		const fetcher: AuthorizedFetch = async () => jsonResponse({ projects })

		await expect(listProjects(fetcher)).resolves.toEqual(projects)
	})

	it('surfaces malformed typed envelopes instead of returning fallback arrays', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({})

		await expect(listProjectSessions(fetcher, 'project-1')).rejects.toThrow('Malformed project sessions response')
	})
})
