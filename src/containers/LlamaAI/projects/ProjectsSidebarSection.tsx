import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { useEffect, useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useLlamaAINavigate } from '~/contexts/LlamaAINavigate'
import { setStorageItem, useStorageItem } from '~/contexts/localStorageStore'
import { CreateProjectModal } from './CreateProjectModal'
import { useProjectList, useProjectSessions } from './hooks'
import { getProjectTier } from './tier'
import type { ProjectWithStats } from './types'

const VISIBLE_LIMIT = 10
const NESTED_SESSIONS_LIMIT = 5
const LAST_SELECTED_PROJECT_KEY_PREFIX = 'llamaai:last-selected-project-id'

interface ProjectsSidebarSectionProps {
	currentProjectId?: string | null
	currentSessionProjectId?: string | null
	currentSessionId?: string | null
}

export function ProjectsSidebarSection({
	currentProjectId,
	currentSessionProjectId,
	currentSessionId
}: ProjectsSidebarSectionProps) {
	const { user, hasActiveSubscription, isTrial } = useAuthContext()
	const storageKey = `${LAST_SELECTED_PROJECT_KEY_PREFIX}:${user?.id ?? 'anonymous'}`
	const storedProjectId = useStorageItem(storageKey, null)
	const tier = getProjectTier(user, hasActiveSubscription, isTrial)
	const isLocked = tier === 'free'
	const createStore = Ariakit.useDialogStore()
	const { data, isLoading } = useProjectList(!isLocked)
	const expandedProjectId = currentProjectId ?? currentSessionProjectId ?? storedProjectId
	const projectSessions = useProjectSessions(isLocked ? null : expandedProjectId)
	const projects = useMemo<ProjectWithStats[]>(() => data ?? [], [data])
	const visible = projects.slice(0, VISIBLE_LIMIT)
	const hasOverflow = projects.length > VISIBLE_LIMIT
	const activeProjectSessions = projectSessions.data ?? []

	const navigate = useLlamaAINavigate()

	useEffect(() => {
		const activeProjectId = currentProjectId ?? currentSessionProjectId
		if (activeProjectId) setStorageItem(storageKey, activeProjectId)
	}, [currentProjectId, currentSessionProjectId, storageKey])

	const goTo = (path: string) => {
		void Router.push(path)
	}

	const goToProject = (projectId: string) => {
		setStorageItem(storageKey, projectId)
		void navigate.toProject(projectId)
	}

	const goToSession = (sessionId: string) => {
		void navigate.toSession(sessionId)
	}

	const onCreated = (project: { id: string }) => {
		setStorageItem(storageKey, project.id)
		goToProject(project.id)
	}

	return (
		<div className="flex flex-col gap-1 px-4">
			<div className="flex items-center justify-between pt-1 pb-0.5">
				<h2 className="text-xs font-normal tracking-normal text-[#666] normal-case dark:text-[#919296]">Projects</h2>
				<button
					type="button"
					onClick={() => goTo('/ai/projects')}
					className="text-[11px] text-[#999] hover:text-(--old-blue) dark:text-[#555]"
				>
					View all
				</button>
			</div>

			{isLocked ? (
				<button
					type="button"
					onClick={() => goTo('/subscription')}
					className="flex items-center justify-between gap-2 rounded-md border border-dashed border-[#e6e6e6] px-2 py-1.5 text-left text-[11px] text-[#666] transition-colors hover:border-(--old-blue) hover:text-(--old-blue) dark:border-[#2a2b2c] dark:text-[#919296]"
				>
					<span className="flex items-center gap-1.5">
						<Icon name="folder-plus" height={12} width={12} />
						Upgrade for projects
					</span>
					<Icon name="chevron-right" height={12} width={12} />
				</button>
			) : (
				<>
					<button
						type="button"
						onClick={createStore.show}
						className="-mx-1.5 grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					>
						<span className="inline-flex justify-center font-medium text-(--old-blue)" aria-hidden>
							+
						</span>
						<span className="min-w-0 truncate">New project</span>
					</button>

					{isLoading ? (
						<ul aria-hidden className="flex flex-col">
							{[0, 1, 2].map((i) => (
								<li
									key={i}
									className="-mx-1.5 flex h-[26px] items-center gap-1.5 px-1.5 py-1"
									style={{ opacity: 1 - i * 0.25 }}
								>
									<span className="h-3 w-3 shrink-0 rounded-sm bg-[#e6e6e6] dark:bg-[#222324]" />
									<span className="h-3 flex-1 rounded-sm bg-[#e6e6e6] dark:bg-[#222324]" />
								</li>
							))}
						</ul>
					) : visible.length === 0 ? (
						<p className="-mx-1.5 px-1.5 py-1 text-[10px] text-[#999] dark:text-[#555]">No projects yet</p>
					) : (
						<ul className="flex flex-col">
							{visible.map((p) => {
								const isActive = p.id === currentProjectId
								const isSessionContext = !isActive && p.id === currentSessionProjectId
								const isExpanded = p.id === expandedProjectId
								const nestedSessions = isExpanded ? activeProjectSessions : []
								return (
									<li key={p.id} className="flex flex-col">
										<button
											type="button"
											onClick={() => goToProject(p.id)}
											className={`-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-[5px] text-left text-xs transition-colors ${
												isActive
													? 'bg-(--old-blue)/12 text-(--old-blue)'
													: isSessionContext
														? 'font-medium text-(--old-blue) hover:bg-[#f0f0f0] dark:hover:bg-[#222324]'
														: 'text-[#666] hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white'
											}`}
										>
											<span className="min-w-0 flex-1 truncate">{p.name}</span>
										</button>
										{isExpanded && nestedSessions.length > 0 ? (
											<ul className="mt-0.5 mb-1 ml-0.5 flex flex-col border-l border-[#e6e6e6] pl-1.5 dark:border-[#222324]">
												{nestedSessions.slice(0, NESTED_SESSIONS_LIMIT).map((s) => {
													const isCurrent = s.sessionId === currentSessionId
													return (
														<li key={s.sessionId}>
															<button
																type="button"
																onClick={() => goToSession(s.sessionId)}
																className={`flex w-full items-center rounded-md px-2 py-[5px] text-left text-xs transition-colors ${
																	isCurrent
																		? 'bg-(--old-blue)/8 text-(--old-blue)'
																		: 'text-[#666] hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white'
																}`}
															>
																<span className="min-w-0 flex-1 truncate">{s.title || 'Untitled chat'}</span>
															</button>
														</li>
													)
												})}
												{nestedSessions.length > NESTED_SESSIONS_LIMIT ? (
													<li>
														<button
															type="button"
															onClick={() => goToProject(p.id)}
															className="rounded-md px-2 py-1 text-left text-[10px] text-[#999] hover:underline dark:text-[#555]"
														>
															Show more
														</button>
													</li>
												) : null}
											</ul>
										) : null}
									</li>
								)
							})}
						</ul>
					)}

					{hasOverflow ? (
						<button
							type="button"
							onClick={() => goTo('/ai/projects')}
							className="rounded-md px-2 py-1 text-left text-xs text-(--old-blue) hover:underline"
						>
							All projects ({projects.length}) →
						</button>
					) : null}
				</>
			)}

			<CreateProjectModal dialogStore={createStore} onCreated={onCreated} />
		</div>
	)
}
