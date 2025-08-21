import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import ReactDOM from 'react-dom'
import { createFilter } from 'react-select'
import { Icon } from '~/components/Icon'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { slug } from '~/utils'
import { Protocol, TableFilters } from '../../types'
import { reactSelectStyles } from '../../utils/reactSelectStyles'

const CustomProtocolOption = ({ innerProps, label, data }: any) => {
	const protocolSlug = slug(data.label)
	const iconUrl = `https://icons.llamao.fi/icons/protocols/${protocolSlug}?w=48&h=48`
	return (
		<div {...innerProps} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
			{data.logo ? (
				<img
					src={data.logo}
					alt={label}
					style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
				/>
			) : (
				<img
					src={iconUrl}
					alt={label}
					style={{ width: '20px', height: '20px', marginRight: '10px', borderRadius: '50%' }}
					onError={(e) => {
						const target = e.target as HTMLImageElement
						target.style.display = 'none'
					}}
				/>
			)}
			{label}
		</div>
	)
}

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
	categories: string[]
	currentFilters: TableFilters
	onFiltersChange: (filters: TableFilters) => void
	portalTarget: HTMLElement
}

export function ProtocolFilterModal({
	isOpen,
	onClose,
	protocols,
	categories,
	currentFilters,
	onFiltersChange,
	portalTarget
}: ProtocolFilterModalProps) {
	const [selectedProtocols, setSelectedProtocols] = React.useState<string[]>([])
	const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
	const [selectedExcludedCategories, setSelectedExcludedCategories] = React.useState<string[]>([])

	React.useEffect(() => {
		if (isOpen) {
			setSelectedProtocols(currentFilters.protocols || [])
			setSelectedCategories(currentFilters.categories || [])
			setSelectedExcludedCategories(currentFilters.excludedCategories || [])
		}
	}, [isOpen, currentFilters])

	const handleApply = () => {
		onFiltersChange({
			protocols: selectedProtocols.length ? selectedProtocols : undefined,
			categories: selectedCategories.length ? selectedCategories : undefined,
			excludedCategories: selectedExcludedCategories.length ? selectedExcludedCategories : undefined
		})
		onClose()
	}

	const handleClear = () => {
		setSelectedProtocols([])
		setSelectedCategories([])
		setSelectedExcludedCategories([])
		onFiltersChange({})
		onClose()
	}

	const hasActiveFilters = selectedProtocols.length > 0 || selectedCategories.length > 0 || selectedExcludedCategories.length > 0

	const protocolOptions = React.useMemo(() => {
		return protocols.map((protocol) => ({
			value: protocol.name,
			label: protocol.name,
			logo: protocol.logo
		}))
	}, [protocols])

	const categoryOptions = React.useMemo(() => {
		return categories.map((category) => ({
			value: category,
			label: category
		}))
	}, [categories])

	if (!isOpen) return null

	const modalContent = (
		<>
			<div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={onClose} />

			<div
				className="pro-divider fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col border shadow-2xl"
				style={{
					borderRadius: 0,
					backgroundColor: 'var(--pro-bg1)',
					opacity: 1
				}}
			>
				<div
					className="pro-divider flex items-center justify-between border-b p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<h2 className="pro-text1 text-lg font-semibold">Filter Protocols</h2>
					<button onClick={onClose} className="pro-hover-bg p-2 transition-colors">
						<Icon name="x" height={20} width={20} />
					</button>
				</div>

				<div className="flex-1 space-y-6 overflow-y-auto p-4" style={{ backgroundColor: 'var(--pro-bg1)' }}>
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
							menuPortalTarget={portalTarget}
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
							menuPortalTarget={portalTarget}
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
							onChange={(sel: any) => {
								setSelectedProtocols(sel ? sel.map((s: any) => s.value) : [])
							}}
							placeholder="Search and select protocols..."
							styles={{
								...reactSelectStyles,
								menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
							}}
							components={{ Option: CustomProtocolOption, MenuList: VirtualizedMenuList }}
							filterOption={createFilter({ ignoreAccents: false, ignoreCase: false })}
							closeMenuOnSelect={false}
							menuPortalTarget={portalTarget}
							menuPosition="fixed"
							menuPlacement="auto"
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
						<button
							onClick={onClose}
							className="pro-divider pro-hover-bg pro-text1 border px-4 py-2 text-sm transition-colors"
							style={{ borderRadius: 0 }}
						>
							Cancel
						</button>
						<button
							onClick={handleApply}
							className="bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
							style={{ borderRadius: 0 }}
						>
							Apply Filters
						</button>
					</div>
				</div>
			</div>
		</>
	)

	return ReactDOM.createPortal(modalContent, portalTarget)
}
