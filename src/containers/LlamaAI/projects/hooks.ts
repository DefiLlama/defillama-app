import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { SESSIONS_QUERY_KEY } from '~/containers/LlamaAI/hooks/sessionListCache'
import { useAuthContext } from '~/containers/Subscription/auth'
import {
	addTextFile,
	connectGithubSource,
	createProject,
	deleteProject,
	deleteProjectFile,
	disconnectSource,
	getProject,
	getProjectUsage,
	listGithubInstallations,
	listInstallationRepos,
	listProjectFiles,
	listProjectSessions,
	listProjectSources,
	listProjects,
	moveSessionToProject,
	startGithubInstall,
	updateProject,
	uploadProjectFiles
} from './api'
import {
	PROJECTS_KEY,
	PROJECTS_USAGE_KEY,
	projectFilesKey,
	projectKey,
	projectSessionsKey,
	projectSourcesKey
} from './queryKeys'
import type { Project, ProjectWithStats } from './types'

const githubInstallationsKey = ['github', 'installations'] as const
const githubReposKey = (id: number) => ['github', 'installations', id, 'repos'] as const

export function useProjectUsage(enabled = true) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: PROJECTS_USAGE_KEY,
		queryFn: () => getProjectUsage(authorizedFetch),
		enabled: enabled && isAuthenticated,
		staleTime: 30_000
	})
}

export function useProjectSessions(id: string | null | undefined) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: projectSessionsKey(id ?? ''),
		queryFn: () => listProjectSessions(authorizedFetch, id as string),
		enabled: isAuthenticated && !!id,
		staleTime: 30_000
	})
}

export function useProjectList(enabled = true) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: PROJECTS_KEY,
		queryFn: () => listProjects(authorizedFetch),
		enabled: enabled && isAuthenticated,
		staleTime: 30_000
	})
}

export function useProjectDetail(id: string | null | undefined) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: projectKey(id ?? ''),
		queryFn: () => getProject(authorizedFetch, id as string),
		enabled: isAuthenticated && !!id,
		staleTime: 30_000
	})
}

export function useProjectFiles(id: string | null | undefined) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: projectFilesKey(id ?? ''),
		queryFn: () => listProjectFiles(authorizedFetch, id as string, { limit: 500 }),
		enabled: isAuthenticated && !!id,
		staleTime: 30_000
	})
}

export function useProjectSources(id: string | null | undefined) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: projectSourcesKey(id ?? ''),
		queryFn: () => listProjectSources(authorizedFetch, id as string),
		enabled: isAuthenticated && !!id,
		staleTime: 30_000
	})
}

export function useCreateProject() {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { name: string; description?: string | null }) => createProject(authorizedFetch, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useUpdateProject(id: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color' | 'custom_instructions'>>) =>
			updateProject(authorizedFetch, id, body),
		onSuccess: (project) => {
			qc.setQueryData<ProjectWithStats | Project | undefined>(projectKey(id), (old) => {
				if (!old || !('file_count' in old)) return project
				return {
					...old,
					...project
				}
			})
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useDeleteProject() {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => deleteProject(authorizedFetch, id),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useUploadProjectFiles(id: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (files: File[]) => uploadProjectFiles(authorizedFetch, id, files),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: projectFilesKey(id) })
			void qc.invalidateQueries({ queryKey: projectKey(id) })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useAddTextFile(id: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { name: string; content: string }) => addTextFile(authorizedFetch, id, body.name, body.content),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: projectFilesKey(id) })
			void qc.invalidateQueries({ queryKey: projectKey(id) })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useDeleteProjectFile(id: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (fileId: string) => deleteProjectFile(authorizedFetch, id, fileId),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: projectFilesKey(id) })
			void qc.invalidateQueries({ queryKey: projectKey(id) })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useMoveSessionToProject() {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (args: { sessionId: string; projectId: string | null; previousProjectId?: string | null }) =>
			moveSessionToProject(authorizedFetch, args.sessionId, args.projectId),
		onSuccess: (_data, variables) => {
			void qc.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
			if (variables.previousProjectId) {
				void qc.invalidateQueries({ queryKey: projectSessionsKey(variables.previousProjectId) })
			}
			if (variables.projectId) {
				void qc.invalidateQueries({ queryKey: projectSessionsKey(variables.projectId) })
			}
		}
	})
}

export function useGithubInstallations() {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: githubInstallationsKey,
		queryFn: () => listGithubInstallations(authorizedFetch),
		enabled: isAuthenticated,
		staleTime: 60_000,
		refetchOnMount: 'always'
	})
}

export function useGithubRepos(installationId: number | null) {
	const { authorizedFetch, isAuthenticated } = useAuthContext()
	return useQuery({
		queryKey: githubReposKey(installationId ?? 0),
		queryFn: () => listInstallationRepos(authorizedFetch, installationId as number),
		enabled: isAuthenticated && !!installationId,
		staleTime: 60_000,
		refetchOnMount: 'always'
	})
}

export function useStartGithubInstall() {
	const { authorizedFetch } = useAuthContext()
	return useCallback((returnTo?: string) => startGithubInstall(authorizedFetch, returnTo), [authorizedFetch])
}

export function useConnectGithubSource(projectId: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { owner: string; repo: string; branch?: string; installation_id: number }) =>
			connectGithubSource(authorizedFetch, projectId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: projectSourcesKey(projectId) })
			void qc.invalidateQueries({ queryKey: projectFilesKey(projectId) })
			void qc.invalidateQueries({ queryKey: projectKey(projectId) })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}

export function useDisconnectSource(projectId: string) {
	const { authorizedFetch } = useAuthContext()
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (sourceId: string) => disconnectSource(authorizedFetch, projectId, sourceId),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: projectSourcesKey(projectId) })
			void qc.invalidateQueries({ queryKey: projectFilesKey(projectId) })
			void qc.invalidateQueries({ queryKey: projectKey(projectId) })
			void qc.invalidateQueries({ queryKey: PROJECTS_KEY })
		}
	})
}
