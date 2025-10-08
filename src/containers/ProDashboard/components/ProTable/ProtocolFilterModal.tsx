import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { createFilter } from 'react-select'
import { Icon } from '~/components/Icon'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { Protocol, TableFilters } from '../../types'
import { buildProtocolOptions } from '../../utils/buildProtocolOptions'
import { reactSelectStyles } from '../../utils/reactSelectStyles'
import { ProtocolOption } from '../ProtocolOption'

const CustomProtocolOption = ProtocolOption as any

function VirtualizedMenuList(props: any) {
	const { options, children, maxHeight, getValue } = props
	const listRef = React.useRef<HTMLDivElement>(null)
	const itemCount = options.length
	const virtualizer = useVirtualizer({
		count: itemCount,
		getScrollElement: () => listRef.current,
		estimateSize: () => 40
	})
	return (
		<div
			ref={listRef}
			className="thin-scrollbar"
			style={{
				maxHeight,
				overflowY: 'auto',
				position: 'relative'
			}}
		>
			<div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
				{virtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						data-index={virtualRow.index}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							transform: `translateY(${virtualRow.start}px)`
						}}
					>
						{children[virtualRow.index]}
					</div>
				))}
			</div>
		</div>
	)
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

interface ProtocolFilterModalProps {
	isOpen: boolean
	onClose: () => void
	protocols: Protocol[]
	parentProtocols: Array<{ id: string; name: string; logo?: string }>
	categories: string[]
	currentFilters: TableFilters
	onFiltersChange: (filters: TableFilters) => void
	portalTarget: HTMLElement
}

export function ProtocolFilterModal({
	isOpen,
	onClose,
	protocols,
	parentProtocols,
	categories,
	currentFilters,
	onFiltersChange,
	portalTarget
}: ProtocolFilterModalProps) {
	const [selectedProtocols, setSelectedProtocols] = React.useState<string[]>([])
	const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
	const [selectedExcludedCategories, setSelectedExcludedCategories] = React.useState<string[]>([])
	const [selectedOracles, setSelectedOracles] = React.useState<string[]>([])

	React.useEffect(() => {
		if (isOpen) {
			setSelectedProtocols(currentFilters.protocols || [])
			setSelectedCategories(currentFilters.categories || [])
			setSelectedExcludedCategories(currentFilters.excludedCategories || [])
			setSelectedOracles(currentFilters.oracles || [])
		}
	}, [isOpen, currentFilters])

	const handleApply = () => {
		onFiltersChange({
			protocols: selectedProtocols.length ? selectedProtocols : undefined,
			categories: selectedCategories.length ? selectedCategories : undefined,
			excludedCategories: selectedExcludedCategories.length ? selectedExcludedCategories : undefined,
			oracles: selectedOracles.length ? selectedOracles : undefined
		})
		onClose()
	}

	const handleClear = () => {
		setSelectedProtocols([])
		setSelectedCategories([])
		setSelectedExcludedCategories([])
		setSelectedOracles([])
		onFiltersChange({})
		onClose()
	}

	const hasActiveFilters =
		selectedProtocols.length > 0 ||
		selectedCategories.length > 0 ||
		selectedExcludedCategories.length > 0 ||
		selectedOracles.length > 0

	const { options: protocolOptions, parentToChildrenMap } = React.useMemo(() => {
		const list = (protocols as any[]).map((p) => ({
			name: p.name,
			tvl: p.tvl ?? 0,
			parentProtocol: p.parentProtocol ?? null,
			logo: (p as any).logo,
			defillamaId: (p as any).defillamaId
		}))
		return buildProtocolOptions(list, parentProtocols, 'name')
	}, [protocols, parentProtocols])

	const oracleOptions = React.useMemo(() => {
		const tvsByOracle = new Map<string, number>()
		;(protocols as any[]).forEach((p) => {
			const tvl = Number((p as any).tvl) || 0
			const add = (o: string) => tvsByOracle.set(o, (tvsByOracle.get(o) || 0) + tvl)
			if (Array.isArray((p as any).oracles)) {
				;((p as any).oracles as string[]).forEach(add)
			}
			if ((p as any).oraclesByChain) {
				Object.values((p as any).oraclesByChain as Record<string, string[]>)
					.flat()
					.forEach(add)
			}
		})
		return Array.from(tvsByOracle.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([o]) => ({ value: o, label: o }))
	}, [protocols])

	const categoryOptions = React.useMemo(() => {
		return categories.map((category) => ({
			value: category,
			label: category
		}))
	}, [categories])

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) onClose()
			}}
		>
			<Ariakit.Dialog
				className="dialog pro-dashboard max-h-[80dvh] w-full max-w-xl gap-0 rounded-md border border-(--cards-border) bg-(--cards-bg) p-0 shadow-lg"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div
					className="pro-divider flex items-center justify-between border-b p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<h2 className="pro-text1 text-lg font-semibold">Filter Protocols</h2>
					<Ariakit.DialogDismiss className="pro-hover-bg rounded-md p-2 transition-colors">
						<Icon name="x" height={20} width={20} />
						<span className="sr-only">Close dialog</span>
					</Ariakit.DialogDismiss>
				</div>

				<div className="flex-1 space-y-6 overflow-y-auto p-4" style={{ backgroundColor: 'var(--pro-bg1)' }}>
					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">Oracles</label>
						<ReactSelect
							isMulti
							options={oracleOptions}
							value={oracleOptions.filter((opt) => selectedOracles.includes(opt.value))}
							onChange={(sel: any) => {
								setSelectedOracles(sel ? sel.map((s: any) => s.value) : [])
							}}
							placeholder="Select oracles..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ MenuList: SimpleMenuList }}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>
					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">Include Categories</label>
						<ReactSelect
							isMulti
							options={categoryOptions.filter((opt) => !selectedExcludedCategories.includes(opt.value))}
							value={categoryOptions.filter((opt) => selectedCategories.includes(opt.value))}
							onChange={(sel: any) => {
								setSelectedCategories(sel ? sel.map((s: any) => s.value) : [])
							}}
							placeholder="Select categories to include..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ MenuList: SimpleMenuList }}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>

					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">Exclude Categories</label>
						<ReactSelect
							isMulti
							options={categoryOptions.filter((opt) => !selectedCategories.includes(opt.value))}
							value={categoryOptions.filter((opt) => selectedExcludedCategories.includes(opt.value))}
							onChange={(sel: any) => {
								setSelectedExcludedCategories(sel ? sel.map((s: any) => s.value) : [])
							}}
							placeholder="Select categories to exclude..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ MenuList: SimpleMenuList }}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>

					<div>
						<label className="pro-text2 mb-2 block text-sm font-medium">
							Protocols ({selectedProtocols.length} selected)
						</label>
						<ReactSelect
							isMulti
							options={protocolOptions}
							value={protocolOptions.filter((opt) => selectedProtocols.includes(opt.value))}
							onChange={(sel: any, action: any) => {
								if (!action) {
									setSelectedProtocols(sel ? sel.map((s: any) => s.value) : [])
									return
								}

								const current = new Set(selectedProtocols)
								const opt = action.option
								const type = action.action

								if (type === 'clear') {
									setSelectedProtocols([])
									return
								}

								if (!opt) {
									setSelectedProtocols(sel ? sel.map((s: any) => s.value) : [])
									return
								}

								const isChild = !!opt.isChild
								if (type === 'select-option') {
									if (isChild) {
										current.add(opt.value)
									} else {
										const parentName = opt.label
										const children = parentToChildrenMap.get(parentName)
										if (children && children.length > 0) {
											const allSelected = children.every((c) => current.has(c))
											if (allSelected) {
												children.forEach((c) => current.delete(c))
											} else {
												children.forEach((c) => current.add(c))
											}
										} else {
											current.add(opt.value)
										}
									}
								} else if (type === 'deselect-option' || type === 'remove-value') {
									current.delete(opt.value)
								}

								setSelectedProtocols(Array.from(current))
							}}
							placeholder="Search and select protocols..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ Option: CustomProtocolOption, MenuList: VirtualizedMenuList }}
							filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
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
						onClick={handleClear}
						className="pro-text-dimmed hover:pro-text1 px-4 py-2 text-sm transition-colors disabled:opacity-50"
						disabled={!hasActiveFilters}
					>
						Clear all
					</button>
					<div className="flex gap-2">
						<Ariakit.DialogDismiss className="pro-divider pro-hover-bg pro-text1 rounded-md border px-4 py-2 text-sm transition-colors">
							Cancel
						</Ariakit.DialogDismiss>
						<button
							onClick={handleApply}
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
