import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { CreateProjectModal } from './CreateProjectModal'
import { useProjectList, useProjectUsage } from './hooks'
import { getProjectTier } from './tier'
import type { ProjectWithStats } from './types'
import { useHideGlobalNav } from './useHideGlobalNav'

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
	useHideGlobalNav()
	const { user, hasActiveSubscription, isTrial } = useAuthContext()
	const tier = getProjectTier(user, hasActiveSubscription, isTrial)
	const isLocked = tier === 'free'
	const usage = useProjectUsage(!isLocked)
	const createStore = Ariakit.useDialogStore()
	const { data, isLoading } = useProjectList(!isLocked)
	const [query, setQuery] = useState('')
	const [sortBy, setSortBy] = useState<SortBy>('updated')

	const projects = useMemo<ProjectWithStats[]>(() => {
		const list = data ?? []
		const q = query.trim().toLowerCase()
		const filtered = q
			? list.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
			: list
		const sorted = [...filtered].sort((a, b) => {
			if (sortBy === 'name') return a.name.localeCompare(b.name)
			const aDate = sortBy === 'created' ? a.created_at : a.updated_at
			const bDate = sortBy === 'created' ? b.created_at : b.updated_at
			return new Date(bDate).getTime() - new Date(aDate).getTime()
		})
		return sorted
	}, [data, query, sortBy])

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
	const reachedProjectCap = projectLimit !== null && projectLimit !== undefined && projects.length >= projectLimit

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold">Projects</h1>
					<p className="text-xs text-[#666] dark:text-[#919296]">
						{projects.length} project{projects.length === 1 ? '' : 's'}
						{tier === 'trial' && projectLimit ? ` · trial limit ${projectLimit}` : ''}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-1.5 text-xs text-[#666] dark:text-[#919296]">
						Sort
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as SortBy)}
							className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-2 py-1 text-xs text-inherit focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c]"
						>
							<option value="updated">Recently updated</option>
							<option value="created">Recently created</option>
							<option value="name">Name</option>
						</select>
					</label>
					<button
						type="button"
						onClick={createStore.show}
						disabled={reachedProjectCap}
						className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--old-blue)/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Icon name="plus" height={14} width={14} />
						New project
					</button>
				</div>
			</header>

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

			{isLoading ? (
				<div className="flex justify-center py-10">
					<LoadingSpinner size={16} />
				</div>
			) : projects.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#e6e6e6] py-16 text-center text-sm text-[#666] dark:border-[#2a2b2c] dark:text-[#919296]">
					<Icon name="folder-plus" height={28} width={28} className="text-[#999] dark:text-[#555]" />
					<p>Create your first project to upload files or connect a GitHub repo.</p>
					<button
						type="button"
						onClick={createStore.show}
						className="rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--old-blue)/90"
					>
						New project
					</button>
				</div>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map((p) => (
						<li key={p.id}>
							<button
								type="button"
								onClick={() => void Router.push(`/ai/projects/${p.id}`)}
								className="group flex h-full w-full flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-4 text-left transition-colors hover:border-(--old-blue) dark:border-[#222324]"
							>
								<header className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-md bg-(--old-blue)/12 text-(--old-blue) transition-colors group-hover:bg-(--old-blue) group-hover:text-white">
										<Icon name="folder-plus" height={14} width={14} />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate text-sm font-semibold">{p.name}</h3>
										<p className="truncate text-[10px] text-[#999] dark:text-[#555]">
											Updated {relativeTime(p.updated_at)}
										</p>
									</div>
								</header>
								{p.description ? (
									<p className="line-clamp-2 text-xs text-[#666] dark:text-[#919296]">{p.description}</p>
								) : null}
								<footer className="mt-auto flex items-center justify-between text-[10px] text-[#999] dark:text-[#555]">
									<span>
										{p.file_count} file{p.file_count === 1 ? '' : 's'}
									</span>
									<span className="tabular-nums">{formatBytes(p.total_bytes)}</span>
								</footer>
							</button>
						</li>
					))}
				</ul>
			)}

			<CreateProjectModal dialogStore={createStore} onCreated={onCreated} />
		</div>
	)
}
