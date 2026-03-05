'use no memo'

import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import type { FormSubmitEvent } from '~/types/forms'

interface CustomViewModalProps {
	dialogStore: Ariakit.DialogStore
	onSave: (name: string) => void
	existingViewNames: string[]
}

export function CustomViewModal({ dialogStore, onSave, existingViewNames }: CustomViewModalProps) {
	const existingViewNamesLowercased = React.useMemo(() => {
		return new Set(existingViewNames.map((name) => name.trim().toLowerCase()))
	}, [existingViewNames])

	const handleSave = (event: FormSubmitEvent) => {
		event.preventDefault()
		const form = event.currentTarget as HTMLFormElement
		const nameInput = form.elements.namedItem('name') as HTMLInputElement | null
		if (!nameInput) return
		nameInput.setCustomValidity('')
		const normalizedName = nameInput.value.trim()
		const normalizedNameLowercased = normalizedName.toLowerCase()
		if (!normalizedName) {
			nameInput.setCustomValidity('Please enter a view name')
			nameInput.reportValidity()
			return
		}

		if (existingViewNamesLowercased.has(normalizedNameLowercased)) {
			nameInput.setCustomValidity('A view with this name already exists')
			nameInput.reportValidity()
			return
		}

		onSave(normalizedName)
		form.reset()
		dialogStore.setOpen(false)
	}

	return (
		<Ariakit.Dialog
			store={dialogStore}
			portal
			unmountOnHide
			modal
			className="dialog w-full max-w-lg gap-0 rounded-md border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-0 shadow-lg"
		>
			<form className="p-6" onSubmit={handleSave}>
				<div className="mb-6 flex items-center justify-between">
					<Ariakit.DialogHeading id="save-custom-view-title" className="text-xl font-semibold pro-text1">
						Save Custom View
					</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="pro-hover-bg p-1 transition-colors" aria-label="Close">
						<Icon name="x" height={20} width={20} className="pro-text2" />
					</Ariakit.DialogDismiss>
				</div>

				<div className="space-y-6">
					<div>
						<label htmlFor="view-name" className="mb-3 block text-sm font-medium pro-text1">
							View Name
						</label>
						<input
							id="view-name"
							name="name"
							type="text"
							onInput={(event) => event.currentTarget.setCustomValidity('')}
							placeholder="Enter a name for this view..."
							className="w-full rounded-md border pro-border bg-(--bg-glass)/50 px-3 py-2 pro-text1 placeholder:pro-text3 focus:border-(--primary) focus:outline-hidden"
							required
						/>
					</div>

					<div className="bg-(--pro-bg2)/50 p-4">
						<p className="text-sm pro-text3">
							This will save your current column configuration including visibility, order, and any custom columns.
						</p>
					</div>
				</div>

				<div className="mt-8 flex justify-end gap-3">
					<Ariakit.DialogDismiss className="rounded-md border pro-border pro-hover-bg px-6 py-2.5 font-medium pro-text2 transition-colors">
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="submit"
						className="rounded-md border border-(--primary) bg-(--primary) px-6 py-2.5 font-medium text-white transition-colors hover:bg-(--primary-hover)"
					>
						Save View
					</button>
				</div>
			</form>
		</Ariakit.Dialog>
	)
}
