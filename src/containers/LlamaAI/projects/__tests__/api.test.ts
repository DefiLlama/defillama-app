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

	it('treats missing or malformed 2xx envelopes as empty lists', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({})

		await expect(listProjects(fetcher)).resolves.toEqual([])
		await expect(listProjectSessions(fetcher, 'project-1')).resolves.toEqual([])
	})

	it('still throws on non-2xx responses', async () => {
		const fetcher: AuthorizedFetch = async () => jsonResponse({ error: 'nope' }, { status: 500 })

		await expect(listProjects(fetcher)).rejects.toThrow('nope')
		await expect(listProjectSessions(fetcher, 'project-1')).rejects.toThrow('nope')
	})
})
