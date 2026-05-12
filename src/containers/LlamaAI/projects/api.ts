import { AI_SERVER } from '~/constants'
import type {
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

type AuthedFetch = (url: string, options?: RequestInit) => Promise<Response | null>

async function unwrap<T>(p: Promise<Response | null>, fallback: string): Promise<T> {
	const res = await p
	if (!res) throw new Error('Network error')
	if (!res.ok) {
		let message = fallback
		try {
			const body = await res.json()
			if (body?.error) message = body.error
		} catch {
			// ignore
		}
		throw new Error(message)
	}
	return res.json() as Promise<T>
}

export async function getProjectUsage(fetcher: AuthedFetch): Promise<ProjectUsage> {
	return unwrap<ProjectUsage>(fetcher(`${AI_SERVER}/projects/usage`), 'Failed to load usage')
}

export async function listProjectSessions(fetcher: AuthedFetch, id: string): Promise<ProjectChatSession[]> {
	const data = await unwrap<{ sessions: ProjectChatSession[] }>(
		fetcher(`${AI_SERVER}/projects/${id}/sessions`),
		'Failed to load project sessions'
	)
	return data.sessions ?? []
}

export async function listProjects(fetcher: AuthedFetch): Promise<ProjectWithStats[]> {
	const data = await unwrap<{ projects: ProjectWithStats[] }>(
		fetcher(`${AI_SERVER}/projects`),
		'Failed to load projects'
	)
	return data.projects ?? []
}

export async function getProject(fetcher: AuthedFetch, id: string): Promise<ProjectWithStats> {
	const data = await unwrap<{ project: ProjectWithStats }>(
		fetcher(`${AI_SERVER}/projects/${id}`),
		'Failed to load project'
	)
	return data.project
}

export async function createProject(
	fetcher: AuthedFetch,
	body: { name: string; description?: string; icon?: string; color?: string }
): Promise<Project> {
	const data = await unwrap<{ project: Project }>(
		fetcher(`${AI_SERVER}/projects`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		'Failed to create project'
	)
	return data.project
}

export async function updateProject(
	fetcher: AuthedFetch,
	id: string,
	body: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color' | 'custom_instructions'>>
): Promise<Project> {
	const data = await unwrap<{ project: Project }>(
		fetcher(`${AI_SERVER}/projects/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		'Failed to update project'
	)
	return data.project
}

export async function deleteProject(fetcher: AuthedFetch, id: string): Promise<void> {
	await unwrap(fetcher(`${AI_SERVER}/projects/${id}`, { method: 'DELETE' }), 'Failed to delete project')
}

export async function listProjectFiles(
	fetcher: AuthedFetch,
	id: string,
	opts: { limit?: number; offset?: number } = {}
): Promise<{ files: ProjectFile[]; limit: number; offset: number }> {
	const url = new URL(`${AI_SERVER}/projects/${id}/files`)
	if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit))
	if (opts.offset !== undefined) url.searchParams.set('offset', String(opts.offset))
	return unwrap(fetcher(url.toString()), 'Failed to load files')
}

export async function uploadProjectFiles(fetcher: AuthedFetch, id: string, files: File[]): Promise<ImportResult> {
	const form = new FormData()
	for (const file of files) {
		// Folder uploads (<input webkitdirectory> or drag-and-drop a folder) populate
		// webkitRelativePath with the file's path inside the dropped tree. Forward it as
		// the multipart filename so the server preserves directory structure.
		const path = (file as any).webkitRelativePath || file.name
		form.append('file', file, path)
	}
	return unwrap(
		fetcher(`${AI_SERVER}/projects/${id}/files`, {
			method: 'POST',
			body: form
		}),
		'Failed to upload files'
	)
}

export async function addTextFile(
	fetcher: AuthedFetch,
	id: string,
	name: string,
	content: string
): Promise<ImportResult> {
	return unwrap(
		fetcher(`${AI_SERVER}/projects/${id}/files/text`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, content })
		}),
		'Failed to add text file'
	)
}

export async function deleteProjectFile(fetcher: AuthedFetch, projectId: string, fileId: string): Promise<void> {
	await unwrap(
		fetcher(`${AI_SERVER}/projects/${projectId}/files/${fileId}`, { method: 'DELETE' }),
		'Failed to delete file'
	)
}

export async function moveSessionToProject(
	fetcher: AuthedFetch,
	sessionId: string,
	projectId: string | null
): Promise<void> {
	await unwrap(
		fetcher(`${AI_SERVER}/user/sessions/${sessionId}/project`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ projectId })
		}),
		'Failed to move session'
	)
}

export async function startGithubInstall(
	fetcher: AuthedFetch,
	returnTo?: string
): Promise<{ install_url: string; state: string }> {
	const url = new URL(`${AI_SERVER}/github/install/start`)
	if (returnTo) url.searchParams.set('returnTo', returnTo)
	return unwrap(fetcher(url.toString()), 'Failed to start GitHub install')
}

export async function listGithubInstallations(fetcher: AuthedFetch): Promise<GitHubInstallation[]> {
	const res = await fetcher(`${AI_SERVER}/github/installations`)
	if (!res || !res.ok) throw new Error('Failed to list GitHub installations')
	return res.json()
}

export async function listInstallationRepos(fetcher: AuthedFetch, installationId: number): Promise<GitHubRepo[]> {
	const data = await unwrap<{ repos: GitHubRepo[] }>(
		fetcher(`${AI_SERVER}/github/installations/${installationId}/repos`),
		'Failed to list repositories'
	)
	return data.repos ?? []
}

export async function connectGithubSource(
	fetcher: AuthedFetch,
	projectId: string,
	body: { owner: string; repo: string; branch?: string; installation_id: number }
): Promise<ProjectSource> {
	const data = await unwrap<{ source: ProjectSource }>(
		fetcher(`${AI_SERVER}/projects/${projectId}/sources/github`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		'Failed to connect GitHub repository'
	)
	return data.source
}

export async function disconnectSource(fetcher: AuthedFetch, projectId: string, sourceId: string): Promise<void> {
	await unwrap(
		fetcher(`${AI_SERVER}/projects/${projectId}/sources/${sourceId}`, { method: 'DELETE' }),
		'Failed to disconnect source'
	)
}

export async function listProjectSources(fetcher: AuthedFetch, projectId: string): Promise<ProjectSource[]> {
	const data = await unwrap<{ sources: ProjectSource[] }>(
		fetcher(`${AI_SERVER}/projects/${projectId}/sources`),
		'Failed to load sources'
	)
	return data.sources ?? []
}
