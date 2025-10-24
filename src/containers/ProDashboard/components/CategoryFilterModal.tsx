import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { reactSelectStyles } from '../utils/reactSelectStyles'

interface CategoryFilterModalProps {
	isOpen: boolean
	onClose: () => void
	onApply: (include: string[], exclude: string[]) => void
	onClear: () => void
	categories: string[]
	initialInclude: string[]
	initialExclude: string[]
}

function SimpleMenuList(props: any) {
	return (
		<div
			className="thin-scrollbar"
			style={{
				maxHeight: props.maxHeight,
				overflowY: 'auto'
			}}
		>
			{props.children}
		</div>
	)
}

export function CategoryFilterModal({
	isOpen,
	onClose,
	onApply,
	onClear,
	categories,
	initialInclude,
	initialExclude
}: CategoryFilterModalProps) {
	const [selectedInclude, setSelectedInclude] = React.useState<string[]>(initialInclude)
	const [selectedExclude, setSelectedExclude] = React.useState<string[]>(initialExclude)

	React.useEffect(() => {
		if (isOpen) {
			setSelectedInclude(initialInclude)
			setSelectedExclude(initialExclude)
		}
	}, [isOpen, initialInclude, initialExclude])

	const categoryOptions = React.useMemo(
		() =>
			categories.map((category) => ({
				value: category,
				label: category
			})),
		[categories]
	)

	const hasSelections = selectedInclude.length > 0 || selectedExclude.length > 0

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="dialog pro-dashboard max-h-[80dvh] w-full max-w-lg gap-0 rounded-md border border-(--cards-border) bg-(--cards-bg) p-0 shadow-lg"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div
					className="pro-divider flex items-center justify-between border-b p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<h2 className="pro-text1 text-lg font-semibold">Filter Categories</h2>
					<Ariakit.DialogDismiss className="pro-hover-bg rounded-md p-2 transition-colors">
						<Icon name="x" height={20} width={20} />
						<span className="sr-only">Close dialog</span>
					</Ariakit.DialogDismiss>
				</div>

				<div className="flex-1 space-y-6 overflow-y-auto p-4" style={{ backgroundColor: 'var(--pro-bg1)' }}>
					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">Include Categories</label>
						<ReactSelect
							isMulti
							options={categoryOptions.filter((opt) => !selectedExclude.includes(opt.value))}
							value={categoryOptions.filter((opt) => selectedInclude.includes(opt.value))}
							onChange={(selection: any) => {
								setSelectedInclude(selection ? selection.map((item: any) => item.value) : [])
							}}
							placeholder="Select categories to include..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ MenuList: SimpleMenuList }}
							closeMenuOnSelect={false}
							menuPosition="fixed"
						/>
					</div>

					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">Exclude Categories</label>
						<ReactSelect
							isMulti
							options={categoryOptions.filter((opt) => !selectedInclude.includes(opt.value))}
							value={categoryOptions.filter((opt) => selectedExclude.includes(opt.value))}
							onChange={(selection: any) => {
								setSelectedExclude(selection ? selection.map((item: any) => item.value) : [])
							}}
							placeholder="Select categories to exclude..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ MenuList: SimpleMenuList }}
							closeMenuOnSelect={false}
							menuPosition="fixed"
						/>
					</div>
				</div>

				<div
					className="pro-divider flex items-center justify-between border-t p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<button
						onClick={() => {
							setSelectedInclude([])
							setSelectedExclude([])
							onClear()
							onClose()
						}}
						className="pro-text-dimmed hover:pro-text1 px-4 py-2 text-sm transition-colors disabled:opacity-50"
						disabled={!hasSelections}
					>
						Clear all
					</button>
					<div className="flex gap-2">
						<Ariakit.DialogDismiss className="pro-divider pro-hover-bg pro-text1 rounded-md border px-4 py-2 text-sm transition-colors">
							Cancel
						</Ariakit.DialogDismiss>
						<button
							onClick={() => {
								onApply(selectedInclude, selectedExclude)
								onClose()
							}}
							className="rounded-md bg-(--primary) px-4 py-2 text-sm text-white transition-colors hover:bg-(--primary-hover)"
						>
							Apply Filters
						</button>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
