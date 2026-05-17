import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '~/components/Loaders'
import { useUpdateProject } from './hooks'

interface ProjectInstructionsEditorProps {
	projectId: string
	value: string | null
}

const MAX_LENGTH = 8000

export function ProjectInstructionsEditor({ projectId, value }: ProjectInstructionsEditorProps) {
	const update = useUpdateProject(projectId)
	const baselineRef = useRef(value ?? '')
	const [draft, setDraft] = useState(value ?? '')
	const [dirty, setDirty] = useState(false)

	useEffect(() => {
		baselineRef.current = value ?? ''
		setDraft(value ?? '')
		setDirty(false)
	}, [value, projectId])

	const onBlur = async () => {
		const trimmed = draft.trim()
		if (trimmed === baselineRef.current.trim()) {
			setDirty(false)
			return
		}
		try {
			await update.mutateAsync({ custom_instructions: trimmed || null })
			baselineRef.current = trimmed
			setDirty(false)
			toast.success('Instructions saved')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save instructions')
		}
	}

	return (
		<section className="flex flex-col gap-2">
			<header className="flex items-center justify-between">
				<h3 className="text-[13px] font-semibold text-(--text-primary)">Instructions</h3>
				{update.isPending ? (
					<LoadingSpinner size={12} />
				) : dirty ? (
					<span className="text-[11px] text-[#999]">Unsaved</span>
				) : null}
			</header>
			<textarea
				value={draft}
				onChange={(e) => {
					setDraft(e.target.value)
					setDirty(true)
				}}
				onBlur={() => void onBlur()}
				maxLength={MAX_LENGTH}
				rows={6}
				placeholder="System-level guidance for chats in this project. Appended after your global instructions."
				className="resize-y rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-2 text-xs leading-5 text-inherit placeholder:text-[#999] focus:border-(--old-blue) focus:outline-none dark:border-[#2a2b2c] dark:placeholder:text-[#555]"
			/>
			<p className="text-[11px] text-[#999] dark:text-[#555]">
				{draft.length}/{MAX_LENGTH} chars · saved automatically
			</p>
		</section>
	)
}
