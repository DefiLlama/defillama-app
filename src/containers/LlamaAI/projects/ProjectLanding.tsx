import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { AddSourcesMenu } from './AddSourcesMenu'
import { CreateProjectModal } from './CreateProjectModal'
import { DeleteProjectModal } from './DeleteProjectModal'
import { useProjectDetail, useProjectSessions, useProjectUsage } from './hooks'
import { ProjectFilesPanel } from './ProjectFilesPanel'
import { ProjectInstructionsEditor } from './ProjectInstructionsEditor'
import type { ProjectTier } from './types'

function relativeTime(iso: string | null): string {
	if (!iso) return ''
	const t = new Date(iso).getTime()
	const diff = Date.now() - t
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d ago`
	return new Date(iso).toLocaleDateString()
}

interface ProjectLandingProps {
	projectId: string
	tier: ProjectTier
	initialTab?: 'chats' | 'sources'
	onSubmit: (prompt: string) => void
	isStreaming: boolean
	onPickSession: (sessionId: string) => void
}

export function ProjectLanding({
	projectId,
	tier,
	initialTab = 'chats',
	onSubmit,
	isStreaming,
	onPickSession
}: ProjectLandingProps) {
	const router = useRouter()
	const usage = useProjectUsage()
	const project = useProjectDetail(projectId)
	const projectSessions = useProjectSessions(projectId)
	const renameStore = Ariakit.useDialogStore()
	const deleteStore = Ariakit.useDialogStore()
	const tab = initialTab
	const [prompt, setPrompt] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		const el = textareaRef.current
		if (!el) return
		if (!prompt) {
			el.style.height = '20px'
			return
		}
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`
	}, [prompt])

	if (project.isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<LoadingSpinner size={14} />
			</div>
		)
	}

	if (project.error || !project.data) {
		return (
			<div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-2 px-4 text-center">
				<p className="text-sm font-medium">Project unavailable</p>
				<p className="text-xs text-[#666] dark:text-[#919296]">
					{project.error instanceof Error ? project.error.message : 'Failed to load project'}
				</p>
				<button
					type="button"
					onClick={() => void Router.push('/ai/projects')}
					className="rounded-md border border-[#e6e6e6] px-3 py-1.5 text-xs hover:bg-[#f0f0f0] dark:border-[#222324] dark:hover:bg-[#222324]"
				>
					Back to projects
				</button>
			</div>
		)
	}

	const handleSubmit = () => {
		const trimmed = prompt.trim()
		if (!trimmed || isStreaming) return
		onSubmit(trimmed)
		setPrompt('')
	}

	const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	const setTab = (nextTab: 'chats' | 'sources') => {
		if (nextTab === tab) return
		const query = { ...router.query }
		if (nextTab === 'sources') {
			query.tab = 'sources'
		} else {
			delete query.tab
		}
		void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
	}

	const projectBytesLimit = usage.data?.limits.project_bytes ?? null
	const projectFileLimit = usage.data?.limits.project_files ?? null
	const projectBytesUsed = project.data.total_bytes ?? 0
	const projectFileCount = project.data.file_count ?? 0
	const sessions = projectSessions.data ?? []
	const connectGithubQuery = router.query.connectGithub
	const connectGithubValue = Array.isArray(connectGithubQuery) ? connectGithubQuery[0] : connectGithubQuery

	return (
		<div className="thin-scrollbar h-full w-full overflow-y-auto overscroll-contain px-6 pt-6 pb-16">
			<div className="mx-auto flex w-full max-w-[760px] flex-col">
				<header className="flex items-center justify-between gap-3 pb-6">
					<button
						type="button"
						onClick={() => void Router.push('/ai/projects')}
						className="-ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:bg-[#1c1d1e] dark:hover:text-white"
					>
						<Icon name="chevron-left" height={14} width={14} />
						All projects
					</button>
					<div className="flex items-center gap-1">
						<Ariakit.MenuProvider placement="bottom-end">
							<Ariakit.MenuButton className="rounded-md p-1.5 text-[#666] transition-colors hover:bg-[#f0f0f0] dark:text-[#919296] dark:hover:bg-[#1c1d1e]">
								<Icon name="ellipsis" height={16} width={16} />
							</Ariakit.MenuButton>
							<Ariakit.Menu
								gutter={6}
								className="z-50 min-w-[200px] rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-1 text-sm shadow-xl dark:border-[#222324]"
							>
								<Ariakit.MenuItem
									onClick={renameStore.show}
									className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#1c1d1e]"
								>
									Rename project
								</Ariakit.MenuItem>
								<Ariakit.MenuItem
									onClick={deleteStore.show}
									className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
								>
									Delete project
								</Ariakit.MenuItem>
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					</div>
				</header>

				<div className="flex items-center gap-3 pb-5">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-(--old-blue)/20 to-(--old-blue)/5 ring-1 ring-(--old-blue)/30 ring-inset">
						<Icon name="folder-plus" height={15} width={15} className="text-(--old-blue)" />
					</div>
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">{project.data.name}</h1>
						{project.data.description ? (
							<p className="mt-1 line-clamp-1 text-[13px] text-[#666] dark:text-[#919296]">
								{project.data.description}
							</p>
						) : null}
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						handleSubmit()
					}}
					className="group/composer relative mb-5 flex items-center gap-2.5 rounded-3xl border border-[#e6e6e6] bg-(--cards-bg) py-2 pr-2 pl-3 shadow-sm transition-all focus-within:border-(--old-blue)/60 focus-within:shadow-md dark:border-[#222324] dark:bg-[#161718] dark:focus-within:border-(--old-blue)/60"
				>
					<AddSourcesMenu
						projectId={projectId}
						trigger={
							<button
								type="button"
								aria-label="Add sources"
								className="-ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#666] transition-colors hover:bg-[#f0f0f0] hover:text-(--old-blue) dark:text-[#919296] dark:hover:bg-[#1c1d1e]"
							>
								<Icon name="plus" height={15} width={15} />
							</button>
						}
					/>
					<textarea
						ref={textareaRef}
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleKey}
						rows={1}
						placeholder={`New chat in ${project.data.name}`}
						className="block flex-1 resize-none self-center bg-transparent text-[13px] leading-5 text-inherit placeholder:text-[#999] focus:outline-none dark:placeholder:text-[#555]"
						style={{ height: 20 }}
					/>
					<button
						type="submit"
						disabled={!prompt.trim() || isStreaming}
						aria-label="Send message"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--old-blue) text-white transition-all hover:scale-105 hover:bg-(--old-blue)/90 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-30"
					>
						<Icon name="arrow-up" height={13} width={13} />
					</button>
				</form>

				<div role="tablist" className="flex items-center gap-1 border-b border-[#e6e6e6] dark:border-[#222324]">
					{(['chats', 'sources'] as const).map((id, index) => (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={tab === id}
							onClick={() => setTab(id)}
							className={`relative py-2 text-xs font-medium capitalize transition-colors focus:outline-none ${index === 0 ? 'pr-2 pl-0' : 'px-2'} ${
								tab === id
									? 'text-(--old-blue)'
									: 'text-[#666] hover:text-[#1a1a1a] dark:text-[#919296] dark:hover:text-white'
							}`}
						>
							{id}
							{tab === id ? (
								<span
									className={`absolute -bottom-px h-0.5 rounded-full bg-(--old-blue) ${index === 0 ? 'right-2 left-0' : 'inset-x-2'}`}
								/>
							) : null}
						</button>
					))}
				</div>

				<div className="pt-4">
					{tab === 'chats' ? (
						<section>
							{projectSessions.isLoading ? (
								<div className="flex justify-center py-8">
									<LoadingSpinner size={12} />
								</div>
							) : sessions.length === 0 ? (
								<p className="py-10 text-center text-sm text-[#999] dark:text-[#555]">
									Start a chat above to keep conversations organized in this project.
								</p>
							) : (
								<ul className="flex flex-col">
									{sessions.map((s) => (
										<li key={s.sessionId}>
											<button
												type="button"
												onClick={() => onPickSession(s.sessionId)}
												className="group/row -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f6f6f7] dark:hover:bg-[#161718]"
											>
												<span className="min-w-0 flex-1 truncate text-[13px]">{s.title || 'Untitled chat'}</span>
												<span className="shrink-0 text-xs text-[#999] tabular-nums dark:text-[#555]">
													{relativeTime(s.lastActivity ?? s.createdAt)}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					) : (
						<section className="flex flex-col gap-6">
							<ProjectInstructionsEditor projectId={projectId} value={project.data.custom_instructions} />
							<ProjectFilesPanel
								projectId={projectId}
								autoOpenGitHub={connectGithubValue === '1'}
								projectBytesUsed={projectBytesUsed}
								projectBytesLimit={projectBytesLimit}
								projectFileCount={projectFileCount}
								projectFileLimit={projectFileLimit}
								tier={tier}
							/>
						</section>
					)}
				</div>

				<CreateProjectModal dialogStore={renameStore} mode="rename" project={project.data} />
				<DeleteProjectModal
					dialogStore={deleteStore}
					project={project.data}
					onDeleted={() => void Router.push('/ai/projects')}
				/>
			</div>
		</div>
	)
}
