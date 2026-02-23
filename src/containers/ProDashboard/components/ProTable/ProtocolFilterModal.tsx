'use no memo'

import * as Ariakit from '@ariakit/react'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import type { TableFilters } from '../../types'
import { buildProtocolOptions } from '../../utils/buildProtocolOptions'
import { reactSelectStyles } from '../../utils/reactSelectStyles'
import type { IProtocolRow } from './proTable.types'

const EMPTY_FILTERS: string[] = []

const extractSelectedValues = (selection: unknown): string[] => {
	if (!Array.isArray(selection)) return []

	const values: string[] = []
	for (const option of selection) {
		if (typeof option !== 'object' || option === null) continue
		const value = Reflect.get(option, 'value')
		if (typeof value === 'string') {
			values.push(value)
		}
	}
	return values
}

type ProtocolSelectionOption = {
	value: string
	label: string
	isChild?: boolean
}

const isProtocolSelectionOption = (value: unknown): value is ProtocolSelectionOption => {
	if (typeof value !== 'object' || value === null) return false
	const optionValue = Reflect.get(value, 'value')
	const optionLabel = Reflect.get(value, 'label')
	const optionIsChild = Reflect.get(value, 'isChild')
	if (typeof optionValue !== 'string' || typeof optionLabel !== 'string') return false
	return optionIsChild === undefined || typeof optionIsChild === 'boolean'
}

const expandSelectedProtocols = (selectedProtocols: string[], parentToChildrenMap: Map<string, string[]>): string[] => {
	const expanded = new Set<string>()
	for (const selectedProtocol of selectedProtocols) {
		const children = parentToChildrenMap.get(selectedProtocol)
		if (children && children.length > 0) {
			for (const child of children) {
				expanded.add(child)
			}
		} else {
			expanded.add(selectedProtocol)
		}
	}
	return Array.from(expanded)
}

const resolveProtocolSelection = ({
	selection,
	actionMeta,
	parentToChildrenMap,
	currentSelection
}: {
	selection: unknown
	actionMeta: unknown
	parentToChildrenMap: Map<string, string[]>
	currentSelection: string[]
}): string[] => {
	const selectedValues = extractSelectedValues(selection)
	const selectedValueSet = new Set(currentSelection)

	if (typeof actionMeta !== 'object' || actionMeta === null) {
		return expandSelectedProtocols(selectedValues, parentToChildrenMap)
	}

	const action = Reflect.get(actionMeta, 'action')
	if (action === 'clear') return []

	const option = Reflect.get(actionMeta, 'option')
	if (!isProtocolSelectionOption(option) || option.isChild) {
		return expandSelectedProtocols(selectedValues, parentToChildrenMap)
	}

	const childProtocols = parentToChildrenMap.get(option.label)
	if (!childProtocols || childProtocols.length === 0) {
		return expandSelectedProtocols(selectedValues, parentToChildrenMap)
	}

	const allChildrenSelected = childProtocols.every((childProtocol) => selectedValueSet.has(childProtocol))
	if (allChildrenSelected) {
		for (const childProtocol of childProtocols) {
			selectedValueSet.delete(childProtocol)
		}
	} else {
		for (const childProtocol of childProtocols) {
			selectedValueSet.add(childProtocol)
		}
	}

	return Array.from(selectedValueSet)
}

interface ProtocolFilterModalProps {
	isOpen: boolean
	onClose: () => void
	protocols: IProtocolRow[]
	parentProtocols: Array<{ id: string; name: string; logo?: string }>
	categories: string[]
	currentFilters: TableFilters
	onFiltersChange: (filters: TableFilters) => void
	portalTarget: HTMLElement | null
}

interface ProtocolFilterDialogContentProps {
	onClose: () => void
	protocols: IProtocolRow[]
	parentProtocols: Array<{ id: string; name: string; logo?: string }>
	categories: string[]
	currentFilters: TableFilters
	onFiltersChange: (filters: TableFilters) => void
	portalTarget: HTMLElement | null
}

function ProtocolFilterDialogContent({
	onClose,
	protocols,
	parentProtocols,
	categories,
	currentFilters,
	onFiltersChange,
	portalTarget
}: ProtocolFilterDialogContentProps) {
	const [selectedProtocols, setSelectedProtocols] = React.useState<string[]>(
		() => currentFilters.protocols ?? EMPTY_FILTERS
	)
	const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
		() => currentFilters.categories ?? EMPTY_FILTERS
	)
	const [selectedExcludedCategories, setSelectedExcludedCategories] = React.useState<string[]>(
		() => currentFilters.excludedCategories ?? EMPTY_FILTERS
	)
	const [selectedOracles, setSelectedOracles] = React.useState<string[]>(() => currentFilters.oracles ?? EMPTY_FILTERS)

	const { options: protocolOptions, parentToChildrenMap } = React.useMemo(() => {
		const protocolList = protocols.map((protocol) => ({
			name: protocol.name,
			tvl: typeof protocol.tvl === 'number' ? protocol.tvl : 0,
			parentProtocol: protocol.parentProtocol ?? null,
			logo: protocol.logo,
			defillamaId: protocol.defillamaId
		}))
		return buildProtocolOptions(protocolList, parentProtocols, 'name')
	}, [parentProtocols, protocols])

	const oracleOptions = React.useMemo(() => {
		const tvlByOracle = new Map<string, number>()
		const addTvlToOracle = (oracle: string, tvl: number) => {
			const currentTvl = tvlByOracle.get(oracle) ?? 0
			tvlByOracle.set(oracle, currentTvl + tvl)
		}

		for (const protocol of protocols) {
			const protocolTvl = typeof protocol.tvl === 'number' ? protocol.tvl : 0

			if (Array.isArray(protocol.oracles)) {
				for (const oracle of protocol.oracles) {
					addTvlToOracle(oracle, protocolTvl)
				}
			} else if (protocol.oraclesByChain) {
				for (const chainOracles of Object.values(protocol.oraclesByChain)) {
					for (const oracle of chainOracles) {
						addTvlToOracle(oracle, protocolTvl)
					}
				}
			}
		}

		return Array.from(tvlByOracle.entries())
			.sort((left, right) => right[1] - left[1])
			.map(([oracle]) => ({ value: oracle, label: oracle }))
	}, [protocols])

	const categoryOptions = React.useMemo(() => {
		return categories.map((category) => ({
			value: category,
			label: category
		}))
	}, [categories])

	const selectedProtocolsSet = React.useMemo(() => new Set(selectedProtocols), [selectedProtocols])
	const selectedCategoriesSet = React.useMemo(() => new Set(selectedCategories), [selectedCategories])
	const selectedExcludedCategoriesSet = React.useMemo(
		() => new Set(selectedExcludedCategories),
		[selectedExcludedCategories]
	)
	const selectedOraclesSet = React.useMemo(() => new Set(selectedOracles), [selectedOracles])

	const protocolsValue = React.useMemo(() => {
		return protocolOptions.filter((option) => selectedProtocolsSet.has(option.value))
	}, [protocolOptions, selectedProtocolsSet])

	const oraclesValue = React.useMemo(() => {
		return oracleOptions.filter((option) => selectedOraclesSet.has(option.value))
	}, [oracleOptions, selectedOraclesSet])

	const includeCategoryOptions = React.useMemo(() => {
		return categoryOptions.filter((option) => !selectedExcludedCategoriesSet.has(option.value))
	}, [categoryOptions, selectedExcludedCategoriesSet])

	const includeCategoryValue = React.useMemo(() => {
		return categoryOptions.filter((option) => selectedCategoriesSet.has(option.value))
	}, [categoryOptions, selectedCategoriesSet])

	const excludeCategoryOptions = React.useMemo(() => {
		return categoryOptions.filter((option) => !selectedCategoriesSet.has(option.value))
	}, [categoryOptions, selectedCategoriesSet])

	const excludeCategoryValue = React.useMemo(() => {
		return categoryOptions.filter((option) => selectedExcludedCategoriesSet.has(option.value))
	}, [categoryOptions, selectedExcludedCategoriesSet])

	const hasActiveFilters =
		selectedProtocols.length > 0 ||
		selectedCategories.length > 0 ||
		selectedExcludedCategories.length > 0 ||
		selectedOracles.length > 0

	const handleApply = () => {
		const expandedProtocols = expandSelectedProtocols(selectedProtocols, parentToChildrenMap)
		onFiltersChange({
			protocols: expandedProtocols.length > 0 ? expandedProtocols : undefined,
			categories: selectedCategories.length > 0 ? selectedCategories : undefined,
			excludedCategories: selectedExcludedCategories.length > 0 ? selectedExcludedCategories : undefined,
			oracles: selectedOracles.length > 0 ? selectedOracles : undefined
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

	return (
		<Ariakit.DialogProvider open={true} setOpen={(open) => (open ? undefined : onClose())}>
			<Ariakit.Dialog
				className="dialog max-h-[80dvh] w-full max-w-xl gap-0 rounded-md border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-0 shadow-lg"
				unmountOnHide
				portal
				portalElement={portalTarget ?? undefined}
				hideOnInteractOutside
			>
				<div
					className="flex items-center justify-between border-b pro-divider p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<h2 className="text-lg font-semibold pro-text1">Filter Protocols</h2>
					<Ariakit.DialogDismiss className="rounded-md pro-hover-bg p-2 transition-colors">
						<Icon name="x" height={20} width={20} />
						<span className="sr-only">Close dialog</span>
					</Ariakit.DialogDismiss>
				</div>

				<div className="flex-1 space-y-6 overflow-y-auto p-4" style={{ backgroundColor: 'var(--pro-bg1)' }}>
					<div>
						<label htmlFor="protocol-filter-oracles" className="mb-2 block text-sm font-medium pro-text2">
							Oracles
						</label>
						<ReactSelect
							inputId="protocol-filter-oracles"
							isMulti
							options={oracleOptions}
							value={oraclesValue}
							onChange={(selection) => {
								setSelectedOracles(extractSelectedValues(selection))
							}}
							placeholder="Select oracles..."
							styles={reactSelectStyles}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>
					<div>
						<label htmlFor="protocol-filter-include-categories" className="mb-2 block text-sm font-medium pro-text2">
							Include Categories
						</label>
						<ReactSelect
							inputId="protocol-filter-include-categories"
							isMulti
							options={includeCategoryOptions}
							value={includeCategoryValue}
							onChange={(selection) => {
								setSelectedCategories(extractSelectedValues(selection))
							}}
							placeholder="Select categories to include..."
							styles={reactSelectStyles}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>
					<div>
						<label htmlFor="protocol-filter-exclude-categories" className="mb-2 block text-sm font-medium pro-text2">
							Exclude Categories
						</label>
						<ReactSelect
							inputId="protocol-filter-exclude-categories"
							isMulti
							options={excludeCategoryOptions}
							value={excludeCategoryValue}
							onChange={(selection) => {
								setSelectedExcludedCategories(extractSelectedValues(selection))
							}}
							placeholder="Select categories to exclude..."
							styles={reactSelectStyles}
							closeMenuOnSelect={false}
							menuPosition="fixed"
							menuPlacement="auto"
						/>
					</div>
					<div>
						<label htmlFor="protocol-filter-protocols" className="mb-2 block text-sm font-medium pro-text2">
							Protocols ({selectedProtocols.length} selected)
						</label>
						<ReactSelect
							inputId="protocol-filter-protocols"
							isMulti
							options={protocolOptions}
							value={protocolsValue}
							onChange={(selection, actionMeta) => {
								setSelectedProtocols((currentSelection) =>
									resolveProtocolSelection({
										selection,
										actionMeta,
										parentToChildrenMap,
										currentSelection
									})
								)
							}}
							placeholder="Search and select protocols..."
							styles={reactSelectStyles}
							closeMenuOnSelect={false}
							menuPosition="fixed"
						/>
					</div>
				</div>

				<div
					className="flex items-center justify-between border-t pro-divider p-4"
					style={{ backgroundColor: 'var(--pro-bg1)' }}
				>
					<button
						type="button"
						onClick={handleClear}
						className="pro-text-dimmed px-4 py-2 text-sm transition-colors hover:pro-text1 disabled:opacity-50"
						disabled={!hasActiveFilters}
					>
						Clear all
					</button>
					<div className="flex gap-2">
						<Ariakit.DialogDismiss className="rounded-md border pro-divider pro-hover-bg px-4 py-2 text-sm pro-text1 transition-colors">
							Cancel
						</Ariakit.DialogDismiss>
						<button
							type="button"
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
	const modalKey = React.useMemo(() => {
		const filtersSnapshot = {
			protocols: currentFilters.protocols ?? [],
			categories: currentFilters.categories ?? [],
			excludedCategories: currentFilters.excludedCategories ?? [],
			oracles: currentFilters.oracles ?? []
		}
		return JSON.stringify(filtersSnapshot)
	}, [currentFilters.categories, currentFilters.excludedCategories, currentFilters.oracles, currentFilters.protocols])

	if (!isOpen) return null

	return (
		<ProtocolFilterDialogContent
			key={modalKey}
			onClose={onClose}
			protocols={protocols}
			parentProtocols={parentProtocols}
			categories={categories}
			currentFilters={currentFilters}
			onFiltersChange={onFiltersChange}
			portalTarget={portalTarget}
		/>
	)
}
