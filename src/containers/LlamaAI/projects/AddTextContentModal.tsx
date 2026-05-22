import * as Ariakit from '@ariakit/react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useAddTextFile } from './hooks'

interface AddTextContentModalProps {
	dialogStore: Ariakit.DialogStore
	projectId: string
}

export function AddTextContentModal({ dialogStore, projectId }: AddTextContentModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [name, setName] = useState('')
	const [content, setContent] = useState('')
	const add = useAddTextFile(projectId)

	useEffect(() => {
		if (isOpen) {
			setName('')
			setContent('')
		}
	}, [isOpen])

	const submit = async (e: { preventDefault: () => void }) => {
		e.preventDefault()
		const trimmedName = name.trim()
		if (!trimmedName || !content) return
		try {
			const result = await add.mutateAsync({ name: trimmedName, content })
			if (result.skipped.length > 0 && result.imported.length === 0) {
				toast.error(`Skipped: ${result.skipped[0].reason}`)
				return
			}
			toast.success('Added')
			dialogStore.hide()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add file')
		}
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="fixed top-1/2 left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e6e6e6] bg-(--cards-bg) p-5 shadow-2xl dark:border-[#222324]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-md" />}
			>
				<form onSubmit={submit} className="flex flex-col gap-4">
					<header className="flex items-start justify-between">
						<div>
							<h2 className="text-base font-semibold text-(--text-primary)">Add text content</h2>
							<p className="mt-0.5 text-xs text-[#666] dark:text-[#919296]">
								Paste a note, prompt, or any plain-text content for this project.
							</p>
						</div>
						<Ariakit.DialogDismiss className="-mr-1.5 rounded-lg p-2 text-[#666] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</header>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Filename</span>
						<input
							autoFocus
							required
							maxLength={255}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="notes.md"
							className="rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 font-mono text-sm text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
						/>
					</label>

					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-[#444] dark:text-[#c5c5c5]">Content</span>
						<textarea
							required
							rows={12}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="# my note&#10;Anything goes here…"
							className="resize-y rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 font-mono text-xs text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
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
							disabled={!name.trim() || !content || add.isPending}
							className="flex items-center gap-1.5 rounded-md border border-(--old-blue) bg-(--old-blue) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--old-blue)/90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{add.isPending ? <LoadingSpinner size={12} /> : null}
							Save
						</button>
					</footer>
				</form>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
