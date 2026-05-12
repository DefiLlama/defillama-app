import * as Ariakit from '@ariakit/react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useCreateProject, useUpdateProject } from './hooks'
import type { Project } from './types'

interface CreateProjectModalProps {
	dialogStore: Ariakit.DialogStore
	mode?: 'create' | 'rename'
	project?: Project | null
	onCreated?: (project: Project) => void
}

export function CreateProjectModal({
	dialogStore,
	mode = 'create',
	project = null,
	onCreated
}: CreateProjectModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [name, setName] = useState(project?.name ?? '')
	const [description, setDescription] = useState(project?.description ?? '')
	const create = useCreateProject()
	const update = useUpdateProject(project?.id ?? '')

	useEffect(() => {
		if (isOpen) {
			setName(project?.name ?? '')
			setDescription(project?.description ?? '')
		}
	}, [isOpen, project])

	const submit = async (e: { preventDefault: () => void }) => {
		e.preventDefault()
		const trimmed = name.trim()
		if (!trimmed) return
		try {
			if (mode === 'rename' && project) {
				await update.mutateAsync({ name: trimmed, description: description.trim() || null })
				toast.success('Project updated')
			} else {
				const created = await create.mutateAsync({
					name: trimmed,
					description: description.trim() || null
				})
				onCreated?.(created)
				toast.success('Project created')
			}
			dialogStore.hide()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save project')
		}
	}

	const isPending = create.isPending || update.isPending

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e6e6e6] bg-(--cards-bg) p-5 shadow-2xl dark:border-[#222324]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-md" />}
			>
				<form onSubmit={submit} className="flex flex-col gap-4">
					<header className="flex items-start justify-between">
						<div>
							<h2 className="text-base font-semibold text-(--text-primary)">
								{mode === 'rename' ? 'Rename project' : 'New project'}
							</h2>
							<p className="mt-0.5 text-xs text-[#666] dark:text-[#919296]">
								Group sessions and give them shared file knowledge.
							</p>
						</div>
						<Ariakit.DialogDismiss className="-mr-1.5 rounded-lg p-2 text-[#666] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</header>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Name</span>
						<input
							autoFocus
							required
							maxLength={120}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My research project"
							className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-sm text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
						/>
					</label>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Description (optional)</span>
						<textarea
							rows={3}
							maxLength={500}
							value={description ?? ''}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What's this project about?"
							className="resize-none rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-sm text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
						/>
					</label>

					<footer className="mt-1 flex justify-end gap-2">
						<Ariakit.DialogDismiss
							type="button"
							className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#f0f0f0] dark:text-[#919296] dark:hover:bg-[#222324]"
						>
							Cancel
						</Ariakit.DialogDismiss>
						<button
							type="submit"
							disabled={!name.trim() || isPending}
							className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--old-blue)/90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPending ? <LoadingSpinner size={12} /> : null}
							{mode === 'rename' ? 'Save' : 'Create project'}
						</button>
					</footer>
				</form>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
