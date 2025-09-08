import { useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'

interface CreateDashboardModalProps {
	dialogStore: Ariakit.DialogStore
	onCreate: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
	}) => void
}

export function CreateDashboardModal({ dialogStore, onCreate }: CreateDashboardModalProps) {
	const [dashboardName, setDashboardName] = useState('')
	const [visibility, setVisibility] = useState<'private' | 'public'>('public')
	const [tags, setTags] = useState<string[]>([])
	const [description, setDescription] = useState('')
	const [tagInput, setTagInput] = useState('')

	const handleCreate = () => {
		if (!dashboardName.trim()) {
			return
		}

		onCreate({
			dashboardName: dashboardName.trim(),
			visibility,
			tags,
			description
		})

		setDashboardName('')
		setVisibility('private')
		setTags([])
		setDescription('')
		dialogStore.toggle()
	}

	const handleAddTag = (tag: string) => {
		const trimmedTag = tag.trim().toLowerCase()
		if (trimmedTag && !tags.includes(trimmedTag)) {
			setTags([...tags, trimmedTag])
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && tagInput.trim()) {
			e.preventDefault()
			handleAddTag(tagInput)
		}
	}

	return (
		<Ariakit.Dialog
			store={dialogStore}
			className="dialog w-full max-w-lg gap-0 border border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
		>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="pro-text1 text-xl font-semibold">Create New Dashboard</h2>
				<Ariakit.DialogDismiss className="pro-hover-bg rounded-md p-1 transition-colors">
					<Icon name="x" height={20} width={20} />
					<span className="sr-only">Close dialog</span>
				</Ariakit.DialogDismiss>
			</div>

			<div className="space-y-6">
				<div>
					<label className="pro-text1 mb-3 block text-sm font-medium">Dashboard Name</label>
					<input
						type="text"
						value={dashboardName}
						onChange={(e) => setDashboardName(e.target.value)}
						placeholder="Enter dashboard name"
						className="pro-border pro-text1 placeholder:pro-text3 w-full rounded-md border px-3 py-2 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						autoFocus
					/>
				</div>

				<div>
					<label className="pro-text1 mb-3 block text-sm font-medium">Visibility</label>
					<div className="flex gap-3">
						<button
							onClick={() => setVisibility('public')}
							className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
								visibility === 'public' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
							}`}
						>
							<Icon name="earth" height={16} width={16} className="mr-2 inline" />
							Public
						</button>
						<button
							onClick={() => setVisibility('private')}
							className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
								visibility === 'private' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
							}`}
						>
							<Icon name="key" height={16} width={16} className="mr-2 inline" />
							Private
						</button>
					</div>
					{visibility === 'public' && (
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
							className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border px-3 py-2 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
						<button
							onClick={() => handleAddTag(tagInput)}
							disabled={!tagInput.trim()}
							className={`rounded-md border px-4 py-2 transition-colors ${
								tagInput.trim() ? 'pro-btn-blue-outline' : 'pro-border pro-text3 cursor-not-allowed'
							}`}
						>
							Add Tag
						</button>
					</div>

					<p className="pro-text3 mt-2 text-xs">Press Enter to add tag</p>

					{tags.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{tags.map((tag) => (
								<span
									key={tag}
									className="pro-text2 pro-border flex items-center gap-1 rounded-md border px-3 py-1 text-sm"
								>
									{tag}
									<button onClick={() => handleRemoveTag(tag)} className="hover:text-pro-blue-400">
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
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Describe your dashboard..."
						rows={3}
						className="pro-border pro-text1 placeholder:pro-text3 w-full resize-none rounded-md border px-3 py-2 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
					<p className="pro-text3 mt-1 text-xs">{description.length}/200 characters</p>
				</div>
			</div>

			<div className="mt-8 flex gap-3">
				<Ariakit.DialogDismiss className="pro-border pro-text2 hover:pro-text1 pro-hover-bg flex-1 rounded-md border px-4 py-2 transition-colors">
					Cancel
				</Ariakit.DialogDismiss>
				<button
					onClick={handleCreate}
					disabled={!dashboardName.trim()}
					className={`flex-1 rounded-md px-4 py-2 transition-colors ${
						dashboardName.trim() ? 'pro-btn-purple' : 'pro-text3 pro-border cursor-not-allowed border'
					}`}
				>
					Create Dashboard
				</button>
			</div>
		</Ariakit.Dialog>
	)
}
