'use no memo'

import * as React from 'react'
import { Icon } from '~/components/Icon'

interface CustomViewModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (name: string) => void
	existingViewNames: string[]
}

interface CustomViewModalContentProps {
	onClose: () => void
	onSave: (name: string) => void
	existingViewNames: string[]
}

function CustomViewModalContent({ onClose, onSave, existingViewNames }: CustomViewModalContentProps) {
	const [viewName, setViewName] = React.useState('')
	const [error, setError] = React.useState<string | null>(null)

	const handleSave = () => {
		const normalizedName = viewName.trim()
		if (!normalizedName) {
			setError('Please enter a view name')
			return
		}

		if (existingViewNames.includes(normalizedName)) {
			setError('A view with this name already exists')
			return
		}

		onSave(normalizedName)
		onClose()
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleSave()
			return
		}

		if (event.key === 'Escape') {
			onClose()
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dark:bg-black/70"
			onClick={onClose}
		>
			<div className="w-full max-w-lg rounded-md border pro-border pro-bg1 shadow-lg" onClick={(event) => event.stopPropagation()}>
				<div className="p-6">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-xl font-semibold pro-text1">Save Custom View</h2>
						<button type="button" onClick={onClose} className="pro-hover-bg p-1 transition-colors">
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						<div>
							<label htmlFor="view-name" className="mb-3 block text-sm font-medium pro-text1">
								View Name
							</label>
							<input
								id="view-name"
								type="text"
								value={viewName}
								onChange={(event) => {
									setViewName(event.target.value)
									setError(null)
								}}
								onKeyDown={handleKeyDown}
								placeholder="Enter a name for this view..."
								className="w-full rounded-md border pro-border bg-(--bg-glass)/50 px-3 py-2 pro-text1 placeholder:pro-text3 focus:border-(--primary) focus:outline-hidden"
								autoFocus
							/>
							{error ? <p className="mt-2 text-sm text-(--error)">{error}</p> : null}
						</div>

						<div className="bg-(--pro-bg2)/50 p-4">
							<p className="text-sm pro-text3">
								This will save your current column configuration including visibility, order, and any custom columns.
							</p>
						</div>
					</div>

					<div className="mt-8 flex justify-end gap-3">
						<button
							type="button"
							onClick={onClose}
							className="rounded-md border pro-border pro-hover-bg px-6 py-2.5 font-medium pro-text2 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="rounded-md border border-(--primary) bg-(--primary) px-6 py-2.5 font-medium text-white transition-colors hover:bg-(--primary-hover)"
						>
							Save View
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export function CustomViewModal({ isOpen, onClose, onSave, existingViewNames }: CustomViewModalProps) {
	if (!isOpen) return null

	return <CustomViewModalContent key="custom-view-modal-content" onClose={onClose} onSave={onSave} existingViewNames={existingViewNames} />
}
