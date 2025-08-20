import { useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'

interface DashboardSettingsModalProps {
	isOpen: boolean
	onClose: () => void
	visibility: 'private' | 'public'
	tags: string[]
	description: string
	onVisibilityChange: (visibility: 'private' | 'public') => void
	onTagsChange: (tags: string[]) => void
	onDescriptionChange: (description: string) => void
	onSave: (overrides?: { visibility?: 'private' | 'public'; tags?: string[]; description?: string }) => void
}

export function DashboardSettingsModal({
	isOpen,
	onClose,
	visibility,
	tags,
	description,
	onVisibilityChange,
	onTagsChange,
	onDescriptionChange,
	onSave
}: DashboardSettingsModalProps) {
	const [localVisibility, setLocalVisibility] = useState(visibility)
	const [localTags, setLocalTags] = useState(tags)
	const [localDescription, setLocalDescription] = useState(description)
	const [tagInput, setTagInput] = useState('')

	useEffect(() => {
		setLocalVisibility(visibility)
		setLocalTags(tags)
		setLocalDescription(description)
	}, [visibility, tags, description])

	if (!isOpen) return null

	const handleSave = () => {
		onVisibilityChange(localVisibility)
		onTagsChange(localTags)
		onDescriptionChange(localDescription)
		onSave({
			visibility: localVisibility,
			tags: localTags,
			description: localDescription
		})
		onClose()
	}

	const handleAddTag = (tag: string) => {
		const trimmedTag = tag.trim().toLowerCase()
		if (trimmedTag && !localTags.includes(trimmedTag)) {
			setLocalTags([...localTags, trimmedTag])
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		setLocalTags(localTags.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && tagInput.trim()) {
			e.preventDefault()
			handleAddTag(tagInput)
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dark:bg-black/70"
			onClick={onClose}
		>
			<div className="pro-bg1 pro-border w-full max-w-lg border shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="p-6">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="pro-text1 text-xl font-semibold">Dashboard Settings</h2>
						<button onClick={onClose} className="pro-hover-bg p-1 transition-colors">
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						{/* Visibility Setting */}
						<div>
							<label className="pro-text1 mb-3 block text-sm font-medium">Visibility</label>
							<div className="flex gap-3">
								<button
									onClick={() => setLocalVisibility('public')}
									className={`flex-1 border px-4 py-3 transition-colors ${
										localVisibility === 'public'
											? 'bg-opacity-20 pro-text1 border-(--primary) bg-(--primary)'
											: 'pro-border pro-text3 hover:pro-text1'
									}`}
								>
									<Icon name="earth" height={16} width={16} className="mr-2 inline" />
									Public
								</button>
								<button
									onClick={() => setLocalVisibility('private')}
									className={`flex-1 border px-4 py-3 transition-colors ${
										localVisibility === 'private'
											? 'bg-opacity-20 pro-text1 border-(--primary) bg-(--primary)'
											: 'pro-border pro-text3 hover:pro-text1'
									}`}
								>
									<Icon name="key" height={16} width={16} className="mr-2 inline" />
									Private
								</button>
							</div>
							{localVisibility === 'public' && (
								<p className="pro-text3 mt-2 text-sm">Public dashboards are visible in the Discover tab</p>
							)}
						</div>

						<div>
							<label className="pro-text1 mb-3 block text-sm font-medium">Tags</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={tagInput}
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={handleTagInputKeyDown}
									placeholder="Enter tag name"
									className="bg-opacity-50 pro-border pro-text1 placeholder:pro-text3 flex-1 border bg-(--bg-glass) px-3 py-2 focus:border-(--primary) focus:outline-hidden"
								/>
								<button
									onClick={() => handleAddTag(tagInput)}
									disabled={!tagInput.trim()}
									className={`border px-4 py-2 transition-colors ${
										tagInput.trim()
											? 'border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white'
											: 'pro-border pro-text3 cursor-not-allowed'
									}`}
								>
									Add Tag
								</button>
							</div>

							<p className="pro-text3 mt-2 text-xs">Press Enter to add tag</p>

							{localTags.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-2">
									{localTags.map((tag) => (
										<span
											key={tag}
											className="bg-opacity-50 pro-text2 pro-border flex items-center gap-1 border bg-(--bg-glass) px-3 py-1 text-sm"
										>
											{tag}
											<button onClick={() => handleRemoveTag(tag)} className="hover:text-(--primary)">
												<Icon name="x" height={12} width={12} />
											</button>
										</span>
									))}
								</div>
							)}
						</div>

						<div>
							<label className="pro-text1 mb-3 block text-sm font-medium">Description</label>
							<textarea
								value={localDescription}
								onChange={(e) => setLocalDescription(e.target.value)}
								placeholder="Describe your dashboard..."
								rows={3}
								className="bg-opacity-50 pro-border pro-text1 placeholder:pro-text3 w-full resize-none border bg-(--bg-glass) px-3 py-2 focus:border-(--primary) focus:outline-hidden"
							/>
							<p className="pro-text3 mt-1 text-xs">{localDescription.length}/200 characters</p>
						</div>
					</div>

					<div className="mt-8 flex gap-3">
						<button
							onClick={onClose}
							className="pro-border pro-text1 flex-1 border px-4 py-2 transition-colors hover:bg-(--bg-main)"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="flex-1 bg-(--primary) px-4 py-2 text-white transition-colors hover:bg-(--primary-hover)"
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
