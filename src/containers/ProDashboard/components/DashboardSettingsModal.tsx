import * as Ariakit from '@ariakit/react'
import { useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { ConfirmationModal } from './ConfirmationModal'

interface DashboardSettingsModalProps {
	isOpen: boolean
	onClose: () => void
	dashboardName: string
	visibility: 'private' | 'public'
	tags: string[]
	description: string
	dashboardId: string | null
	onDashboardNameChange: (name: string) => void
	onVisibilityChange: (visibility: 'private' | 'public') => void
	onTagsChange: (tags: string[]) => void
	onDescriptionChange: (description: string) => void
	onSave: (overrides?: {
		dashboardName?: string
		visibility?: 'private' | 'public'
		tags?: string[]
		description?: string
	}) => void
	onDelete?: (dashboardId: string) => Promise<void>
}

function DashboardSettingsModalInner({
	isOpen,
	onClose,
	dashboardName,
	visibility,
	tags,
	description,
	dashboardId,
	onDashboardNameChange,
	onVisibilityChange,
	onTagsChange,
	onDescriptionChange,
	onSave,
	onDelete
}: DashboardSettingsModalProps) {
	const [localVisibility, setLocalVisibility] = useState(visibility)
	const [localTags, setLocalTags] = useState(tags)
	const [isDeleting, setIsDeleting] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const tagInputRef = useRef<HTMLInputElement>(null)
	const charCountRef = useRef<HTMLSpanElement>(null)

	const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const formData = new FormData(e.currentTarget)
		const localDashboardName = (formData.get('dashboardName') as string) ?? ''
		const localDescription = (formData.get('description') as string)?.slice(0, 200) ?? ''
		onDashboardNameChange(localDashboardName)
		onVisibilityChange(localVisibility)
		onTagsChange(localTags)
		onDescriptionChange(localDescription)
		onSave({
			dashboardName: localDashboardName,
			visibility: localVisibility,
			tags: localTags,
			description: localDescription
		})
		onClose()
	}

	const handleAddTag = () => {
		const input = tagInputRef.current
		if (!input) return
		const trimmedTag = input.value.trim().toLowerCase()
		if (trimmedTag) {
			setLocalTags((prev) => (prev.includes(trimmedTag) ? prev : [...prev, trimmedTag]))
		}
		input.value = ''
	}

	const handleRemoveTag = (tag: string) => {
		setLocalTags((prev) => prev.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddTag()
		}
	}

	const handleDeleteClick = () => {
		setShowDeleteConfirm(true)
	}

	const handleConfirmDelete = async () => {
		if (!onDelete || !dashboardId) return

		setIsDeleting(true)
		try {
			await onDelete(dashboardId)
			setShowDeleteConfirm(false)
			onClose()
		} catch (error) {
			console.error('Failed to delete dashboard:', error)
		}
		setIsDeleting(false)
	}

	return (
		<>
			<Ariakit.DialogProvider
				open={isOpen}
				setOpen={(open) => {
					if (!open) onClose()
				}}
			>
				<Ariakit.Dialog
					className="dialog w-full max-w-lg gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
					unmountOnHide
					portal
					hideOnInteractOutside
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-xl font-semibold pro-text1">Dashboard Settings</h2>
						<Ariakit.DialogDismiss className="rounded-md pro-hover-bg p-1 transition-colors">
							<Icon name="x" height={20} width={20} className="pro-text2" />
							<span className="sr-only">Close dialog</span>
						</Ariakit.DialogDismiss>
					</div>

					<form onSubmit={handleSave}>
						<div className="space-y-6">
							<div>
								<label htmlFor="dashboard-settings-name" className="mb-3 block text-sm font-medium pro-text1">
									Dashboard Name
								</label>
								<input
									id="dashboard-settings-name"
									name="dashboardName"
									type="text"
									defaultValue={dashboardName}
									placeholder="Enter dashboard name"
									className="w-full rounded-md border pro-border px-3 py-2 pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
								/>
							</div>

							<div>
								<p id="dashboard-settings-visibility" className="mb-3 block text-sm font-medium pro-text1">
									Visibility
								</p>
								<div className="flex gap-3" aria-labelledby="dashboard-settings-visibility">
									<button
										type="button"
										onClick={() => setLocalVisibility('public')}
										aria-pressed={localVisibility === 'public'}
										className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
											localVisibility === 'public' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
										}`}
									>
										<Icon name="earth" height={16} width={16} className="mr-2 inline" />
										Public
									</button>
									<button
										type="button"
										onClick={() => setLocalVisibility('private')}
										aria-pressed={localVisibility === 'private'}
										className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
											localVisibility === 'private' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
										}`}
									>
										<Icon name="key" height={16} width={16} className="mr-2 inline" />
										Private
									</button>
								</div>
								{localVisibility === 'public' && (
									<p className="mt-2 text-sm pro-text3">Public dashboards are visible in the Discover tab</p>
								)}
							</div>

							<div>
								<label htmlFor="dashboard-settings-tag-input" className="mb-3 block text-sm font-medium pro-text1">
									Tags
								</label>
								<div className="flex gap-2">
									<input
										id="dashboard-settings-tag-input"
										ref={tagInputRef}
										type="text"
										onKeyDown={handleTagInputKeyDown}
										placeholder="Enter tag name"
										className="flex-1 rounded-md border pro-border px-3 py-2 pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
									/>
									<button
										type="button"
										onClick={handleAddTag}
										className="rounded-md pro-btn-blue-outline border px-4 py-2 transition-colors"
									>
										Add Tag
									</button>
								</div>

								<p className="mt-2 text-xs pro-text3">Press Enter to add tag</p>

								{localTags.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-2">
										{localTags.map((tag) => (
											<span
												key={tag}
												className="flex items-center gap-1 rounded-md border pro-border px-3 py-1 text-sm pro-text2"
											>
												{tag}
												<button
													type="button"
													onClick={() => handleRemoveTag(tag)}
													aria-label={`Remove tag ${tag}`}
													title={`Remove tag ${tag}`}
													className="hover:text-pro-blue-400"
												>
													<Icon name="x" height={12} width={12} />
												</button>
											</span>
										))}
									</div>
								)}
							</div>

							<div>
								<label htmlFor="dashboard-settings-description" className="mb-3 block text-sm font-medium pro-text1">
									Description
								</label>
								<textarea
									id="dashboard-settings-description"
									name="description"
									defaultValue={description}
									onInput={(e) => {
										if (charCountRef.current) charCountRef.current.textContent = String(e.currentTarget.value.length)
									}}
									placeholder="Describe your dashboard..."
									maxLength={200}
									rows={3}
									className="w-full resize-none rounded-md border pro-border px-3 py-2 pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
								/>
								<p className="mt-1 text-xs pro-text3">
									<span ref={charCountRef}>{description.length}</span>/200 characters
								</p>
							</div>

							{onDelete && dashboardId && (
								<div className="border-t border-(--cards-border) pt-6">
									<p className="mb-3 block text-sm font-medium pro-text1 text-red-500">Danger Zone</p>
									<p className="mb-4 text-sm pro-text3">Once you delete a dashboard, there is no going back.</p>
									<button
										type="button"
										onClick={handleDeleteClick}
										disabled={isDeleting}
										className="flex items-center gap-2 rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{isDeleting ? <LoadingSpinner size={16} /> : <Icon name="trash-2" height={16} width={16} />}
										<span>Delete Dashboard</span>
									</button>
								</div>
							)}
						</div>

						<div className="mt-8 flex gap-3">
							<Ariakit.DialogDismiss
								type="button"
								className="flex-1 rounded-md border pro-border pro-hover-bg px-4 py-2 pro-text2 transition-colors hover:pro-text1"
							>
								Cancel
							</Ariakit.DialogDismiss>
							<button type="submit" className="flex-1 rounded-md pro-btn-blue px-4 py-2 transition-colors">
								Save Changes
							</button>
						</div>
					</form>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>

			<ConfirmationModal
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleConfirmDelete}
				title="Delete Dashboard"
				message="Are you sure you want to delete this dashboard? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
			/>
		</>
	)
}

export function DashboardSettingsModal(props: DashboardSettingsModalProps) {
	const modalKey = `${props.dashboardId ?? 'new'}:${props.isOpen ? 'open' : 'closed'}`
	return <DashboardSettingsModalInner key={modalKey} {...props} />
}
