import * as Ariakit from '@ariakit/react'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'

interface Props {
	suggestedName: string
	existingNames: string[]
	onSave: (name: string, replaceExisting: boolean) => void
	onClose: () => void
	title?: string
	description?: string
	submitLabel?: string
	replaceLabel?: string
	placeholder?: string
}

export function SavePresetDialog({
	suggestedName,
	existingNames,
	onSave,
	onClose,
	title = 'Save preset',
	description = 'Saved presets let you re-run this download with the same columns and filters.',
	submitLabel = 'Save',
	replaceLabel = 'Replace',
	placeholder = 'e.g. Aave fees — weekly'
}: Props) {
	const [name, setName] = useState(suggestedName)

	const existingSet = useMemo(() => {
		const s = new Set<string>()
		for (const n of existingNames) s.add(n.trim().toLowerCase())
		return s
	}, [existingNames])

	const trimmed = name.trim()
	const isEmpty = trimmed.length === 0
	const isDuplicate = !isEmpty && existingSet.has(trimmed.toLowerCase())

	return (
		<Ariakit.DialogProvider
			open
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="fixed inset-0 z-60 m-auto flex h-fit w-[calc(100vw-2rem)] max-w-md flex-col gap-4 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-5 shadow-2xl"
				portal
				unmountOnHide
				backdrop={<div className="fixed inset-0 z-50 bg-black/40" />}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<h2 className="text-base font-semibold">{title}</h2>
						{description ? <p className="text-xs text-(--text-tertiary)">{description}</p> : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1.5 text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-4 w-4" />
					</button>
				</div>

				<form
					onSubmit={(event) => {
						event.preventDefault()
						if (isEmpty) return
						onSave(trimmed, isDuplicate)
					}}
					className="flex flex-col gap-3"
				>
					<label className="flex flex-col gap-1">
						<span className="text-xs font-medium text-(--text-secondary)">Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							className="w-full rounded-md border border-(--divider) bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/30"
							placeholder={placeholder}
						/>
					</label>

					{isDuplicate ? (
						<p className="text-xs text-amber-500">A preset named "{trimmed}" exists — saving will replace it.</p>
					) : null}

					<div className="mt-1 flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="rounded-md border border-(--divider) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isEmpty}
							className="flex items-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
						>
							<Icon name="bookmark" className="h-3.5 w-3.5" />
							{isDuplicate ? replaceLabel : submitLabel}
						</button>
					</div>
				</form>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
