import { llamaAIRequest, type AuthorizedFetch } from '~/containers/LlamaAI/api/transport'
import type {
	GitHubBranch,
	GitHubInstallation,
	GitHubRepo,
	ImportResult,
	Project,
	ProjectChatSession,
	ProjectFile,
	ProjectSource,
	ProjectUsage,
	ProjectWithStats
} from './types'

export async function getProjectUsage(fetcher: AuthorizedFetch): Promise<ProjectUsage> {
	return llamaAIRequest<ProjectUsage>(fetcher, '/projects/usage')
}

export async function listProjectSessions(fetcher: AuthorizedFetch, id: string): Promise<ProjectChatSession[]> {
	const data = await llamaAIRequest<{ sessions?: ProjectChatSession[] }>(fetcher, `/projects/${id}/sessions`)
	if (data.sessions === undefined) throw new Error('Malformed project sessions response')
	return data.sessions
}

export async function listProjects(fetcher: AuthorizedFetch): Promise<ProjectWithStats[]> {
	const data = await llamaAIRequest<{ projects?: ProjectWithStats[] }>(fetcher, '/projects')
	if (data.projects === undefined) throw new Error('Malformed projects response')
	return data.projects
}

export async function getProject(fetcher: AuthorizedFetch, id: string): Promise<ProjectWithStats> {
	const data = await llamaAIRequest<{ project: ProjectWithStats }>(fetcher, `/projects/${id}`)
	return data.project
}

export async function createProject(
	fetcher: AuthorizedFetch,
	body: { name: string; description?: string | null; icon?: string; color?: string }
): Promise<Project> {
	const data = await llamaAIRequest<{ project: Project }>(fetcher, '/projects', {
		method: 'POST',
		json: body
	})
	return data.project
}

export async function updateProject(
	fetcher: AuthorizedFetch,
	id: string,
	body: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color' | 'custom_instructions'>>
): Promise<Project> {
	const data = await llamaAIRequest<{ project: Project }>(fetcher, `/projects/${id}`, {
		method: 'PATCH',
		json: body
	})
	return data.project
}

export async function deleteProject(fetcher: AuthorizedFetch, id: string): Promise<void> {
	await llamaAIRequest(fetcher, `/projects/${id}`, { method: 'DELETE' })
}

export async function listProjectFiles(
	fetcher: AuthorizedFetch,
	id: string,
	opts: { limit?: number; offset?: number } = {}
): Promise<{ files: ProjectFile[]; limit: number; offset: number }> {
	const params = new URLSearchParams()
	if (opts.limit !== undefined) params.set('limit', String(opts.limit))
	if (opts.offset !== undefined) params.set('offset', String(opts.offset))
	const query = params.toString()
	return llamaAIRequest(fetcher, `/projects/${id}/files${query ? `?${query}` : ''}`)
}

export async function uploadProjectFiles(fetcher: AuthorizedFetch, id: string, files: File[]): Promise<ImportResult> {
	const form = new FormData()
	for (const file of files) {
		// Folder uploads (<input webkitdirectory> or drag-and-drop a folder) populate
		// webkitRelativePath with the file's path inside the dropped tree. Forward it as
		// the multipart filename so the server preserves directory structure.
		const path = (file as any).webkitRelativePath || file.name
		form.append('file', file, path)
	}
	return llamaAIRequest(fetcher, `/projects/${id}/files`, {
		method: 'POST',
		body: form
	})
}

export async function addTextFile(
	fetcher: AuthorizedFetch,
	id: string,
	name: string,
	content: string
): Promise<ImportResult> {
	return llamaAIRequest(fetcher, `/projects/${id}/files/text`, {
		method: 'POST',
		json: { name, content }
	})
}

export async function deleteProjectFile(fetcher: AuthorizedFetch, projectId: string, fileId: string): Promise<void> {
	await llamaAIRequest(fetcher, `/projects/${projectId}/files/${fileId}`, { method: 'DELETE' })
}

export async function moveSessionToProject(
	fetcher: AuthorizedFetch,
	sessionId: string,
	projectId: string | null
): Promise<void> {
	await llamaAIRequest(fetcher, `/user/sessions/${sessionId}/project`, {
		method: 'PATCH',
		json: { projectId }
	})
}

export async function startGithubInstall(
	fetcher: AuthorizedFetch,
	returnTo?: string
): Promise<{ install_url: string; state: string }> {
	const params = new URLSearchParams()
	if (returnTo) params.set('returnTo', returnTo)
	const query = params.toString()
	return llamaAIRequest(fetcher, `/github/install/start${query ? `?${query}` : ''}`)
}

export async function listGithubInstallations(fetcher: AuthorizedFetch): Promise<GitHubInstallation[]> {
	return llamaAIRequest(fetcher, '/github/installations')
}

export async function listInstallationRepos(fetcher: AuthorizedFetch, installationId: number): Promise<GitHubRepo[]> {
	const data = await llamaAIRequest<{ repos?: GitHubRepo[] }>(fetcher, `/github/installations/${installationId}/repos`)
	if (data.repos === undefined) throw new Error('Malformed GitHub repos response')
	return data.repos
}

export async function listInstallationRepoBranches(
	fetcher: AuthorizedFetch,
	installationId: number,
	owner: string,
	repo: string
): Promise<GitHubBranch[]> {
	return llamaAIRequest<GitHubBranch[]>(
		fetcher,
		`/github/installations/${installationId}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`
	)
}

export async function connectGithubSource(
	fetcher: AuthorizedFetch,
	projectId: string,
	body: { owner: string; repo: string; branch?: string; installation_id: number }
): Promise<ProjectSource> {
	const data = await llamaAIRequest<{ source: ProjectSource }>(fetcher, `/projects/${projectId}/sources/github`, {
		method: 'POST',
		json: body
	})
	return data.source
}

export async function disconnectSource(fetcher: AuthorizedFetch, projectId: string, sourceId: string): Promise<void> {
	await llamaAIRequest(fetcher, `/projects/${projectId}/sources/${sourceId}`, { method: 'DELETE' })
}

export async function listProjectSources(fetcher: AuthorizedFetch, projectId: string): Promise<ProjectSource[]> {
	const data = await llamaAIRequest<{ sources?: ProjectSource[] }>(fetcher, `/projects/${projectId}/sources`)
	if (data.sources === undefined) throw new Error('Malformed project sources response')
	return data.sources
}
