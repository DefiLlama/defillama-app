import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import Router from 'next/router'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { useAuthContext } from '~/containers/Subscription/auth'
import { CreateProjectModal } from './CreateProjectModal'
import { DeleteProjectModal } from './DeleteProjectModal'
import { useProjectList, useProjectUsage } from './hooks'
import { getProjectTier } from './tier'
import type { ProjectWithStats } from './types'

function formatBytes(bytes: number | string): string {
	const n = Number(bytes ?? 0)
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function relativeTime(iso: string): string {
	const t = new Date(iso).getTime()
	const diff = Date.now() - t
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d ago`
	const months = Math.floor(days / 30)
	if (months < 12) return `${months}mo ago`
	return new Date(iso).toLocaleDateString()
}

type SortBy = 'updated' | 'created' | 'name'

export function ProjectsGrid() {
	const { user, hasActiveSubscription, isTrial } = useAuthContext()
	const tier = getProjectTier(user, hasActiveSubscription, isTrial)
	const isLocked = tier === 'free'
	const usage = useProjectUsage(!isLocked)
	const createStore = Ariakit.useDialogStore()
	const deleteStore = Ariakit.useDialogStore()
	const { data, isLoading } = useProjectList(!isLocked)
	const [query, setQuery] = useState('')
	const [sortBy, setSortBy] = useState<SortBy>('updated')
	const [projectToDelete, setProjectToDelete] = useState<ProjectWithStats | null>(null)
	const deferredQuery = useDeferredValue(query)
	const allProjects = useMemo<ProjectWithStats[]>(() => data ?? [], [data])

	const visibleProjects = useMemo<ProjectWithStats[]>(() => {
		const q = deferredQuery.trim()
		const filtered = q
			? matchSorter(allProjects, q, {
					keys: ['name', 'description'],
					threshold: matchSorter.rankings.CONTAINS
				})
			: allProjects
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'name') return a.name.localeCompare(b.name)
			const aDate = sortBy === 'created' ? a.created_at : a.updated_at
			const bDate = sortBy === 'created' ? b.created_at : b.updated_at
			return new Date(bDate).getTime() - new Date(aDate).getTime()
		})
		return sorted
	}, [allProjects, deferredQuery, sortBy])

	const onCreated = (project: { id: string }) => {
		void Router.push(`/ai/projects/${project.id}`)
	}

	if (isLocked) {
		return (
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-12 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--old-blue)/12">
					<Icon name="folder-plus" height={28} width={28} className="text-(--old-blue)" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold">Projects are a paid feature</h1>
					<p className="max-w-md text-sm text-[#666] dark:text-[#919296]">
						Upload files or connect a GitHub repo, then chat with LlamaAI using that knowledge.
					</p>
				</div>
				<button
					type="button"
					onClick={() => void Router.push('/subscription')}
					className="rounded-md border border-(--old-blue) bg-(--old-blue) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--old-blue)/90"
				>
					Upgrade to enable Projects
				</button>
			</div>
		)
	}

	const projectLimit = usage.data?.limits.projects
	const hasProjectLimit = projectLimit !== null && projectLimit !== undefined
	const reachedProjectCap = hasProjectLimit && allProjects.length >= projectLimit
	const hasProjects = allProjects.length > 0
	const hasSearchQuery = deferredQuery.trim().length > 0
	const createProjectButton = (
		<button
			type="button"
			onClick={createStore.show}
			disabled={reachedProjectCap}
			className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--old-blue)/90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Icon name="plus" height={14} width={14} />
			New project
		</button>
	)

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">Projects</h1>
					{hasProjects ? (
						<p className="text-xs text-[#666] dark:text-[#919296]">
							{allProjects.length} project{allProjects.length === 1 ? '' : 's'}
						</p>
					) : null}
				</div>
				{hasProjects ? (
					<div className="flex items-center gap-2">
						{hasProjectLimit ? (
							<span className="text-xs text-[#666] tabular-nums dark:text-[#919296]">
								{allProjects.length} / {projectLimit} projects
							</span>
						) : null}
						<label className="flex items-center gap-1.5 text-xs text-[#666] dark:text-[#919296]">
							Sort
							<select
								value={sortBy}
								onChange={(e) => startTransition(() => setSortBy(e.target.value as SortBy))}
								className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-2 py-1 text-xs text-inherit focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c]"
							>
								<option value="updated">Recently updated</option>
								<option value="created">Recently created</option>
								<option value="name">Name</option>
							</select>
						</label>
						<Tooltip
							content={reachedProjectCap ? `Project limit reached (${allProjects.length} / ${projectLimit}).` : null}
						>
							{createProjectButton}
						</Tooltip>
					</div>
				) : null}
			</header>

			{hasProjects ? (
				<div className="group/search relative flex items-center rounded-md bg-[#f5f5f5] transition-colors focus-within:bg-[#ebebeb] dark:bg-[#1a1a1b] dark:focus-within:bg-[#222324]">
					<Icon
						name="search"
						height={14}
						width={14}
						className="pointer-events-none ml-3 shrink-0 text-[#999] group-focus-within/search:text-(--old-blue) dark:text-[#555]"
					/>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search projects"
						className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs text-inherit placeholder:text-[#aaa] focus:outline-none dark:placeholder:text-[#555]"
					/>
					{query ? (
						<button
							type="button"
							onClick={() => setQuery('')}
							className="mr-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#ccc] text-white hover:bg-[#999] dark:bg-[#444] dark:hover:bg-[#666]"
						>
							<Icon name="x" height={8} width={8} />
						</button>
					) : null}
				</div>
			) : null}

			{isLoading ? (
				<div className="flex justify-center py-10">
					<LoadingSpinner size={16} />
				</div>
			) : !hasProjects ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#e6e6e6] py-12 text-center text-sm text-[#666] dark:border-[#2a2b2c] dark:text-[#919296]">
					<Icon name="folder-plus" height={28} width={28} className="text-[#999] dark:text-[#555]" />
					<p>Create your first project to upload files or connect a GitHub repo.</p>
					<Tooltip
						content={reachedProjectCap ? `Project limit reached (${allProjects.length} / ${projectLimit}).` : null}
					>
						{createProjectButton}
					</Tooltip>
				</div>
			) : visibleProjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#e6e6e6] py-12 text-center text-sm text-[#666] dark:border-[#2a2b2c] dark:text-[#919296]">
					<Icon name="search" height={24} width={24} className="text-[#999] dark:text-[#555]" />
					<p>No projects match "{deferredQuery.trim()}".</p>
					{hasSearchQuery ? (
						<button
							type="button"
							onClick={() => setQuery('')}
							className="rounded-md border border-[#e6e6e6] px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--old-blue) dark:border-[#2a2b2c]"
						>
							Clear search
						</button>
					) : null}
				</div>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{visibleProjects.map((p) => (
						<li key={p.id}>
							<button
								type="button"
								onClick={() => void Router.push(`/ai/projects/${p.id}`)}
								className="group flex h-full w-full flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-3 text-left transition-colors hover:border-(--old-blue) dark:border-[#222324]"
							>
								<header className="flex items-center gap-2">
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--old-blue)/12 text-(--old-blue) transition-colors group-hover:bg-(--old-blue) group-hover:text-white">
										<Icon name="folder-plus" height={13} width={13} />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate text-sm font-semibold">{p.name}</h3>
										<p className="truncate text-xs text-[#999] dark:text-[#555]">
											Updated {relativeTime(p.updated_at)}
										</p>
									</div>
									<Tooltip
										content="Delete project"
										render={
											<button
												type="button"
												aria-label={`Delete ${p.name}`}
												onClick={(e) => {
													e.preventDefault()
													e.stopPropagation()
													setProjectToDelete(p)
													deleteStore.show()
												}}
											/>
										}
										className="pointer-events-none -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#999] opacity-0 transition-[opacity,color,background-color] group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-600 focus-visible:pointer-events-auto focus-visible:opacity-100 dark:text-[#666] dark:hover:text-red-400"
									>
										<Icon name="trash-2" height={13} width={13} />
									</Tooltip>
								</header>
								{p.description ? (
									<p className="line-clamp-2 text-[13px] text-[#666] dark:text-[#919296]">{p.description}</p>
								) : null}
								<footer className="mt-auto flex items-center justify-between text-xs text-[#999] tabular-nums dark:text-[#555]">
									<span>
										{p.file_count} file{p.file_count === 1 ? '' : 's'}
									</span>
									<span>{formatBytes(p.total_bytes)}</span>
								</footer>
							</button>
						</li>
					))}
				</ul>
			)}

			<CreateProjectModal dialogStore={createStore} onCreated={onCreated} />
			<DeleteProjectModal
				dialogStore={deleteStore}
				project={projectToDelete}
				onDeleted={() => setProjectToDelete(null)}
			/>
		</div>
	)
}
