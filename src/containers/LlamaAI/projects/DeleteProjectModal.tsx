import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDeleteProject } from './hooks'
import type { Project } from './types'

interface DeleteProjectModalProps {
	dialogStore: Ariakit.DialogStore
	project: Project | null
	onDeleted?: () => void
}

export function DeleteProjectModal({ dialogStore, project, onDeleted }: DeleteProjectModalProps) {
	const remove = useDeleteProject()

	const onConfirm = async () => {
		if (!project) return
		try {
			await remove.mutateAsync(project.id)
			toast.success('Project deleted')
			dialogStore.hide()
			onDeleted?.()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete project')
		}
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e6e6e6] bg-(--cards-bg) p-5 shadow-2xl dark:border-[#222324]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-md" />}
			>
				<header className="flex items-start justify-between">
					<div>
						<h2 className="text-base font-semibold text-(--text-primary)">Delete project?</h2>
						<p className="mt-0.5 text-xs text-[#666] dark:text-[#919296]">
							{project?.name ? `“${project.name}” ` : 'This project '}
							will be soft-deleted and permanently removed in 14 days. Attached sessions remain.
						</p>
					</div>
					<Ariakit.DialogDismiss className="-mr-1.5 rounded-lg p-2 text-[#666] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
						<Icon name="x" height={16} width={16} />
					</Ariakit.DialogDismiss>
				</header>

				<footer className="mt-5 flex justify-end gap-2">
					<Ariakit.DialogDismiss
						type="button"
						className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#f0f0f0] dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="button"
						onClick={() => void onConfirm()}
						disabled={remove.isPending}
						className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
					>
						{remove.isPending ? <LoadingSpinner size={12} /> : null}
						Delete project
					</button>
				</footer>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
