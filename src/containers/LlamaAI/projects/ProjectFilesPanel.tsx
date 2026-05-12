import * as Ariakit from '@ariakit/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { AddTextContentModal } from './AddTextContentModal'
import { GitHubConnectModal } from './GitHubConnectModal'
import {
	useDeleteProjectFile,
	useDisconnectSource,
	useProjectFiles,
	useProjectSources,
	useUploadProjectFiles
} from './hooks'
import type { ProjectFile, ProjectSource } from './types'

function formatBytes(bytes: number | string): string {
	const n = Number(bytes ?? 0)
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface ProjectFilesPanelProps {
	projectId: string
	projectBytesUsed: number
	projectBytesLimit: number | null
	projectFileCount: number
	projectFileLimit: number | null
	tier: 'free' | 'trial' | 'paid' | 'llama'
}

export function ProjectFilesPanel({
	projectId,
	projectBytesUsed,
	projectBytesLimit,
	projectFileCount,
	projectFileLimit,
	tier
}: ProjectFilesPanelProps) {
	const filesQuery = useProjectFiles(projectId)
	const sourcesQuery = useProjectSources(projectId)
	const upload = useUploadProjectFiles(projectId)
	const deleteFile = useDeleteProjectFile(projectId)
	const disconnect = useDisconnectSource(projectId)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const addTextStore = Ariakit.useDialogStore()
	const githubStore = Ariakit.useDialogStore()
	const [isDragging, setIsDragging] = useState(false)

	const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data])
	const sourceById = useMemo(() => {
		const map = new Map<string, ProjectSource>()
		for (const s of sources) map.set(s.id, s)
		return map
	}, [sources])

	const projectPercent =
		projectBytesLimit === null || projectBytesLimit === 0
			? 0
			: Math.min(100, (projectBytesUsed / projectBytesLimit) * 100)

	const handleFiles = useCallback(
		async (fileList: File[]) => {
			if (fileList.length === 0) return
			const isArchive = (f: File) => /\.(zip|tar|tgz|gz|7z|rar)$/i.test(f.name) || f.type === 'application/zip'
			const archives = fileList.filter(isArchive)
			const others = fileList.filter((f) => !isArchive(f))
			if (archives.length > 0) {
				toast.error('Archive uploads are not supported. Unzip and drop the folder instead.')
			}
			if (others.length === 0) return
			try {
				const res = await upload.mutateAsync(others)
				if (res.imported.length > 0) {
					toast.success(`Uploaded ${res.imported.length} file${res.imported.length === 1 ? '' : 's'}`)
				}
				for (const s of res.skipped) toast.error(`Skipped ${s.path}: ${s.reason}`)
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Upload failed')
			}
		},
		[upload]
	)

	const onPick = () => fileInputRef.current?.click()
	const onDropZoneDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const files = Array.from(e.dataTransfer.files)
		void handleFiles(files)
	}

	const onDelete = async (file: ProjectFile) => {
		if (!window.confirm(`Delete ${file.path}?`)) return
		try {
			await deleteFile.mutateAsync(file.id)
			toast.success('File deleted')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete')
		}
	}

	const onDisconnectSource = async (source: ProjectSource) => {
		if (!window.confirm(`Disconnect ${source.mount_path}?`)) return
		try {
			await disconnect.mutateAsync(source.id)
			toast.success('Source disconnected')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to disconnect')
		}
	}

	const files = filesQuery.data?.files ?? []
	const githubSources = sources.filter((s) => s.adapter_type === 'github')

	return (
		<section className="flex flex-1 flex-col gap-3">
			<header className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-(--text-primary)">Files</h3>
				<Ariakit.MenuProvider placement="bottom-end">
					<Ariakit.MenuButton className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue)/12 px-2.5 py-1 text-xs font-medium text-(--old-blue) hover:bg-(--old-blue) hover:text-white">
						<Icon name="plus" height={12} width={12} />
						Add
					</Ariakit.MenuButton>
					<Ariakit.Menu
						gutter={6}
						className="z-50 min-w-[220px] rounded-md border border-[#e6e6e6] bg-(--cards-bg) p-1 text-xs shadow-lg dark:border-[#222324]"
					>
						<Ariakit.MenuItem
							onClick={onPick}
							className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f0f0f0] dark:hover:bg-[#222324]"
						>
							<Icon name="file-plus" height={14} width={14} />
							Upload from device
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => addTextStore.show()}
							className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f0f0f0] dark:hover:bg-[#222324]"
						>
							<Icon name="file-text" height={14} width={14} />
							Add text content
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => githubStore.show()}
							className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f0f0f0] dark:hover:bg-[#222324]"
						>
							<Icon name="github" height={14} width={14} />
							Connect GitHub repo
						</Ariakit.MenuItem>
					</Ariakit.Menu>
				</Ariakit.MenuProvider>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					hidden
					onChange={(e) => {
						const list = e.target.files ? Array.from(e.target.files) : []
						void handleFiles(list)
						if (fileInputRef.current) fileInputRef.current.value = ''
					}}
				/>
			</header>

			<div className="flex flex-col gap-1">
				<div className="flex items-baseline justify-between gap-2 text-[10px] text-[#666] dark:text-[#919296]">
					<span>
						{projectBytesLimit
							? `${formatBytes(projectBytesUsed)} / ${formatBytes(projectBytesLimit)} used`
							: `${formatBytes(projectBytesUsed)} used`}
						{projectFileLimit ? ` · ${projectFileCount} / ${projectFileLimit} files` : ` · ${projectFileCount} files`}
					</span>
					{tier === 'free' ? <span className="text-yellow-600 dark:text-yellow-500">Free tier</span> : null}
				</div>
				{projectBytesLimit ? (
					<div className="h-1 w-full overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-[#222324]">
						<div
							className={`h-full transition-all ${projectPercent > 90 ? 'bg-red-500' : 'bg-(--old-blue)'}`}
							style={{ width: `${projectPercent}%` }}
						/>
					</div>
				) : null}
			</div>

			{githubSources.length > 0 ? (
				<ul className="flex flex-col gap-1">
					{githubSources.map((source) => {
						const owner = String(source.config.owner ?? '')
						const repo = String(source.config.repo ?? '')
						const branch = source.config.branch ? String(source.config.branch) : 'default'
						return (
							<li
								key={source.id}
								className="group flex items-center gap-2 rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-2.5 py-1.5 text-xs dark:border-[#222324]"
							>
								<Icon name="github" height={12} width={12} className="shrink-0 text-[#666] dark:text-[#919296]" />
								<span className="min-w-0 flex-1 truncate font-mono">
									{owner}/{repo}
								</span>
								<span className="shrink-0 rounded-sm bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] text-[#666] dark:bg-[#222324] dark:text-[#919296]">
									{branch}
								</span>
								<Tooltip
									content="Disconnect"
									render={
										<button
											type="button"
											onClick={() => void onDisconnectSource(source)}
											className="shrink-0 rounded-sm p-1 text-[#999] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
										/>
									}
								>
									<Icon name="trash-2" height={12} width={12} />
								</Tooltip>
							</li>
						)
					})}
				</ul>
			) : null}

			<div
				onDragOver={(e) => {
					e.preventDefault()
					setIsDragging(true)
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={onDropZoneDrop}
				className={`min-h-[120px] flex-1 overflow-auto rounded-md border border-dashed transition-colors ${
					isDragging ? 'border-(--old-blue) bg-(--old-blue)/5' : 'border-[#e6e6e6] dark:border-[#2a2b2c]'
				}`}
			>
				{filesQuery.isLoading ? (
					<div className="flex h-full items-center justify-center p-4 text-xs text-[#666] dark:text-[#919296]">
						<LoadingSpinner size={12} />
					</div>
				) : files.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center text-xs text-[#666] dark:text-[#919296]">
						<Icon name="file-plus" height={20} width={20} className="text-[#999] dark:text-[#555]" />
						<p>Drop files here or use the Add menu.</p>
						<p className="text-[10px]">Markdown, text, code, JSON, CSV. Up to 30 MB per file.</p>
					</div>
				) : (
					<ul className="flex flex-col">
						{files.map((file) => {
							const source = sourceById.get(file.source_id)
							const sourceBadge = source?.adapter_type === 'github' ? 'gh' : 'blob'
							return (
								<li
									key={file.id}
									className="group flex items-center gap-2 border-b border-[#f0f0f0] px-2.5 py-1.5 text-xs last:border-b-0 hover:bg-[#fafafa] dark:border-[#1d1e1f] dark:hover:bg-[#1a1a1b]"
								>
									<Icon name="file-text" height={12} width={12} className="shrink-0 text-[#666] dark:text-[#919296]" />
									<span className="min-w-0 flex-1 truncate font-mono">{file.path}</span>
									<span className="shrink-0 rounded-sm bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] tracking-wide text-[#666] uppercase dark:bg-[#222324] dark:text-[#919296]">
										{sourceBadge}
									</span>
									<span className="shrink-0 text-[#999] tabular-nums dark:text-[#555]">{formatBytes(file.size)}</span>
									{sourceBadge === 'blob' ? (
										<Tooltip
											content="Delete file"
											render={
												<button
													type="button"
													onClick={() => void onDelete(file)}
													className="shrink-0 rounded-sm p-1 text-[#999] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
												/>
											}
										>
											<Icon name="trash-2" height={12} width={12} />
										</Tooltip>
									) : null}
								</li>
							)
						})}
					</ul>
				)}
			</div>

			{upload.isPending ? (
				<p className="flex items-center gap-1.5 text-xs text-[#666] dark:text-[#919296]">
					<LoadingSpinner size={10} /> Uploading…
				</p>
			) : null}

			<AddTextContentModal dialogStore={addTextStore} projectId={projectId} />
			<GitHubConnectModal dialogStore={githubStore} projectId={projectId} />
		</section>
	)
}
