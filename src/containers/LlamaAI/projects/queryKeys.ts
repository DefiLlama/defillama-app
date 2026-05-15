export const PROJECTS_KEY = ['projects'] as const
export const PROJECTS_USAGE_KEY = ['projects', 'usage'] as const

export const projectKey = (id: string) => ['projects', id] as const
export const projectFilesKey = (id: string) => ['projects', id, 'files'] as const
export const projectSessionsKey = (id: string) => ['projects', id, 'sessions'] as const
export const projectSourcesKey = (id: string) => ['projects', id, 'sources'] as const

export function isProjectSessionsQueryKey(queryKey: readonly unknown[]) {
	return queryKey[0] === 'projects' && queryKey[2] === 'sessions'
}
