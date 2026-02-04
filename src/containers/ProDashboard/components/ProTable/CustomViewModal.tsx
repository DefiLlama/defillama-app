import * as React from 'react'
import { Icon } from '~/components/Icon'

interface CustomViewModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (name: string) => void
	existingViewNames: string[]
}

export function CustomViewModal({ isOpen, onClose, onSave, existingViewNames }: CustomViewModalProps) {
	const [viewName, setViewName] = React.useState('')
	const [error, setError] = React.useState<string | null>(null)

	React.useEffect(() => {
		if (isOpen) {
			setViewName('')
			setError(null)
		}
	}, [isOpen])

	const handleSave = () => {
		if (!viewName.trim()) {
			setError('Please enter a view name')
			return
		}

		if (existingViewNames.includes(viewName.trim())) {
			setError('A view with this name already exists')
			return
		}

		onSave(viewName.trim())
		onClose()
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave()
		} else if (e.key === 'Escape') {
			onClose()
		}
	}

	if (!isOpen) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dark:bg-black/70"
			onClick={onClose}
		>
			<div
				className="w-full max-w-lg rounded-md border pro-border pro-bg1 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-6">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-xl font-semibold pro-text1">Save Custom View</h2>
						<button onClick={onClose} className="pro-hover-bg p-1 transition-colors">
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
								onChange={(e) => {
									setViewName(e.target.value)
									setError(null)
								}}
								onKeyDown={handleKeyDown}
								placeholder="Enter a name for this view..."
								className="bg-opacity-50 w-full rounded-md border pro-border bg-(--bg-glass) px-3 py-2 pro-text1 placeholder:pro-text3 focus:border-(--primary) focus:outline-hidden"
								autoFocus
							/>
							{error && <p className="mt-2 text-sm text-(--error)">{error}</p>}
						</div>

						<div className="bg-opacity-50 pro-bg2 p-4">
							<p className="text-sm pro-text3">
								This will save your current column configuration including visibility, order, and any custom columns.
							</p>
						</div>
					</div>

					<div className="mt-8 flex justify-end gap-3">
						<button
							onClick={onClose}
							className="rounded-md border pro-border pro-hover-bg px-6 py-2.5 font-medium pro-text2 transition-colors"
						>
							Cancel
						</button>
						<button
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
