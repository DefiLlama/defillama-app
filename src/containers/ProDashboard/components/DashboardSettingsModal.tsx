import { useState, useEffect } from 'react'
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
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div className="pro-bg1 shadow-2xl w-full max-w-lg border pro-border" onClick={(e) => e.stopPropagation()}>
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-semibold pro-text1">Dashboard Settings</h2>
						<button onClick={onClose} className="p-1 pro-hover-bg transition-colors">
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						{/* Visibility Setting */}
						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">Visibility</label>
							<div className="flex gap-3">
								<button
									onClick={() => setLocalVisibility('public')}
									className={`flex-1 px-4 py-3 border transition-colors ${
										localVisibility === 'public'
											? 'border-(--primary1) bg-(--primary1) bg-opacity-20 pro-text1'
											: 'pro-border pro-text3 hover:pro-text1'
									}`}
								>
									<Icon name="earth" height={16} width={16} className="inline mr-2" />
									Public
								</button>
								<button
									onClick={() => setLocalVisibility('private')}
									className={`flex-1 px-4 py-3 border transition-colors ${
										localVisibility === 'private'
											? 'border-(--primary1) bg-(--primary1) bg-opacity-20 pro-text1'
											: 'pro-border pro-text3 hover:pro-text1'
									}`}
								>
									<Icon name="key" height={16} width={16} className="inline mr-2" />
									Private
								</button>
							</div>
							{localVisibility === 'public' && (
								<p className="mt-2 text-sm pro-text3">Public dashboards are visible in the Discover tab</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">Tags</label>
							<div className="flex gap-2">
								<input
									type="text"
									value={tagInput}
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={handleTagInputKeyDown}
									placeholder="Enter tag name"
									className="flex-1 px-3 py-2 bg-(--bg7) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1)"
								/>
								<button
									onClick={() => handleAddTag(tagInput)}
									disabled={!tagInput.trim()}
									className={`px-4 py-2 border transition-colors ${
										tagInput.trim()
											? 'border-(--primary1) text-(--primary1) hover:bg-(--primary1) hover:text-white'
											: 'pro-border pro-text3 cursor-not-allowed'
									}`}
								>
									Add Tag
								</button>
							</div>

							<p className="mt-2 text-xs pro-text3">Press Enter to add tag</p>

							{localTags.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-3">
									{localTags.map((tag) => (
										<span
											key={tag}
											className="px-3 py-1 bg-(--bg7) bg-opacity-50 text-sm pro-text2 border pro-border flex items-center gap-1"
										>
											{tag}
											<button onClick={() => handleRemoveTag(tag)} className="hover:text-(--primary1)">
												<Icon name="x" height={12} width={12} />
											</button>
										</span>
									))}
								</div>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">Description</label>
							<textarea
								value={localDescription}
								onChange={(e) => setLocalDescription(e.target.value)}
								placeholder="Describe your dashboard..."
								rows={3}
								className="w-full px-3 py-2 bg-(--bg7) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) resize-none"
							/>
							<p className="mt-1 text-xs pro-text3">{localDescription.length}/200 characters</p>
						</div>
					</div>

					<div className="flex gap-3 mt-8">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2 border pro-border pro-text1 hover:bg-(--bg1) transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="flex-1 px-4 py-2 bg-(--primary1) text-white hover:bg-(--primary1-hover) transition-colors"
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
