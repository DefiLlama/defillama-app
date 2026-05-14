import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useLlamaAINavigate } from '~/contexts/LlamaAINavigate'
import { CreateProjectModal } from './CreateProjectModal'
import { useProjectList, useProjectSessions } from './hooks'
import { getProjectTier } from './tier'
import type { ProjectWithStats } from './types'

const VISIBLE_LIMIT = 10
const NESTED_SESSIONS_LIMIT = 5

interface ProjectsSidebarSectionProps {
	currentProjectId?: string | null
	currentSessionId?: string | null
}

export function ProjectsSidebarSection({ currentProjectId, currentSessionId }: ProjectsSidebarSectionProps) {
	const { user, hasActiveSubscription, isTrial } = useAuthContext()
	const tier = getProjectTier(user, hasActiveSubscription, isTrial)
	const isLocked = tier === 'free'
	const createStore = Ariakit.useDialogStore()
	const { data, isLoading } = useProjectList(!isLocked)
	const projectSessions = useProjectSessions(isLocked ? null : currentProjectId)
	const projects = useMemo<ProjectWithStats[]>(() => data ?? [], [data])
	const visible = projects.slice(0, VISIBLE_LIMIT)
	const hasOverflow = projects.length > VISIBLE_LIMIT
	const activeProjectSessions = projectSessions.data ?? []

	const navigate = useLlamaAINavigate()

	const goTo = (path: string) => {
		void Router.push(path)
	}

	const goToProject = (projectId: string) => {
		void navigate.toProject(projectId)
	}

	const goToSession = (sessionId: string) => {
		void navigate.toSession(sessionId)
	}

	const onCreated = (project: { id: string }) => {
		goToProject(project.id)
	}

	return (
		<div className="flex flex-col gap-1 px-4">
			<div className="flex items-center justify-between pt-1 pb-0.5">
				<h2 className="text-xs font-semibold tracking-wider text-[#666] uppercase dark:text-[#919296]">Projects</h2>
				<button
					type="button"
					onClick={() => goTo('/ai/projects')}
					className="text-[10px] text-[#999] hover:text-(--old-blue) dark:text-[#555]"
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
						className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					>
						<Icon name="folder-plus" height={13} width={13} className="text-(--old-blue)" />
						New project
					</button>

					{isLoading ? (
						<ul aria-hidden className="flex flex-col">
							{[0, 1, 2].map((i) => (
								<li key={i} className="flex h-[26px] items-center gap-1.5 px-2 py-1" style={{ opacity: 1 - i * 0.25 }}>
									<span className="h-3 w-3 shrink-0 rounded-sm bg-[#e6e6e6] dark:bg-[#222324]" />
									<span className="h-3 flex-1 rounded-sm bg-[#e6e6e6] dark:bg-[#222324]" />
								</li>
							))}
						</ul>
					) : visible.length === 0 ? (
						<p className="px-2 py-1 text-[10px] text-[#999] dark:text-[#555]">No projects yet</p>
					) : (
						<ul className="flex flex-col">
							{visible.map((p) => {
								const isActive = p.id === currentProjectId
								const nestedSessions = isActive ? activeProjectSessions : []
								return (
									<li key={p.id} className="flex flex-col">
										<button
											type="button"
											onClick={() => goToProject(p.id)}
											className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors ${
												isActive
													? 'bg-(--old-blue)/12 text-(--old-blue)'
													: 'text-[#666] hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white'
											}`}
										>
											<Icon name="folder-plus" height={12} width={12} className="shrink-0 opacity-60" />
											<span className="min-w-0 flex-1 truncate">{p.name}</span>
										</button>
										{isActive && nestedSessions.length > 0 ? (
											<ul className="mt-0.5 mb-1 flex flex-col border-l border-[#e6e6e6] pl-1.5 dark:border-[#222324]">
												{nestedSessions.slice(0, NESTED_SESSIONS_LIMIT).map((s) => {
													const isCurrent = s.sessionId === currentSessionId
													return (
														<li key={s.sessionId}>
															<button
																type="button"
																onClick={() => goToSession(s.sessionId)}
																className={`flex w-full items-center rounded-md px-2 py-1 text-left text-[11px] transition-colors ${
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
							className="rounded-md px-2 py-1 text-left text-[11px] text-(--old-blue) hover:underline"
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
