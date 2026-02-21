import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { fetchChainsByCategory, fetchChainsCategories } from '~/containers/Chains/api'
import { useProDashboardCatalog } from '../../../ProDashboardAPIContext'
import { AriakitMultiSelect } from '../../AriakitMultiSelect'
import { useComparisonWizardContext } from '../ComparisonWizardContext'

interface Option {
	value: string
	label: string
	logo: string
	isChild?: boolean
	parentSlug?: string
}

export function SelectItemsStep() {
	const { state, actions } = useComparisonWizardContext()
	const { protocols, chains, protocolsLoading } = useProDashboardCatalog()
	const [search, setSearch] = useState('')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const listRef = useRef<HTMLDivElement>(null)

	const { data: chainCategoriesList } = useQuery({
		queryKey: ['chains2-categories'],
		queryFn: async () => {
			const data = await fetchChainsCategories()
			return (data?.categories as string[]) || []
		},
		staleTime: 60 * 60 * 1000,
		enabled: state.comparisonType === 'chains'
	})

	const { data: chainCategoryData } = useQuery({
		queryKey: ['chains-by-category', chainCategoriesList],
		queryFn: async () => {
			if (!chainCategoriesList) return new Map<string, Set<string>>()
			const results = await Promise.all(
				chainCategoriesList.map(async (cat) => {
					try {
						const data = await fetchChainsByCategory(cat)
						return { category: cat, chains: (data?.chainsUnique as string[]) || [] }
					} catch {
						return { category: cat, chains: [] as string[] }
					}
				})
			)
			const chainsInCategory = new Map<string, Set<string>>()
			for (const { category, chains } of results) {
				chainsInCategory.set(category, new Set(chains))
			}
			return chainsInCategory
		},
		staleTime: 60 * 60 * 1000,
		enabled: state.comparisonType === 'chains' && !!chainCategoriesList?.length
	})

	const options: Option[] = useMemo(() => {
		if (state.comparisonType === 'chains') {
			return [...chains]
				.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
				.map((chain) => ({
					value: chain.name,
					label: chain.name,
					logo: `https://icons.llamao.fi/icons/chains/rsz_${chain.name.toLowerCase().replace(/\s+/g, '-')}?w=48&h=48`
				}))
		}

		const childrenByParentId = new Map<string, typeof protocols>()
		const parentsOrSolo: typeof protocols = []
		const parentIdToSlug = new Map<string, string>()

		for (const protocol of protocols) {
			if (protocol.parentProtocol) {
				const existing = childrenByParentId.get(protocol.parentProtocol) || []
				childrenByParentId.set(protocol.parentProtocol, [...existing, protocol])
			} else {
				parentsOrSolo.push(protocol)
				parentIdToSlug.set(protocol.id, protocol.slug)
			}
		}

		parentsOrSolo.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const result: Option[] = []

		for (const parent of parentsOrSolo) {
			result.push({
				value: parent.slug,
				label: parent.name,
				logo: parent.logo || `https://icons.llamao.fi/icons/protocols/${parent.slug}?w=48&h=48`
			})
			const children = childrenByParentId.get(parent.id) || []
			if (children.length > 0) {
				children.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
				for (const child of children) {
					result.push({
						value: child.slug,
						label: child.name,
						logo: child.logo || `https://icons.llamao.fi/icons/protocols/${child.slug}?w=48&h=48`,
						isChild: true,
						parentSlug: parent.slug
					})
				}
			}
		}

		return result
	}, [state.comparisonType, chains, protocols])

	const protocolCategoryOptions = useMemo(() => {
		const categoriesSet = new Set<string>()
		for (const protocol of protocols) {
			if (protocol.category) {
				categoriesSet.add(protocol.category)
			}
		}
		return Array.from(categoriesSet)
			.sort()
			.map((cat) => ({ value: cat, label: cat }))
	}, [protocols])

	const selectedCategoriesSet = useMemo(() => new Set(selectedCategories), [selectedCategories])

	const filteredOptions = useMemo(() => {
		let filtered: Option[] = options

		if (selectedCategoriesSet.size > 0) {
			if (state.comparisonType === 'chains') {
				filtered = filtered.filter((o) => {
					for (const cat of selectedCategoriesSet) {
						if (chainCategoryData?.get(cat)?.has(o.value)) return true
					}
					return false
				})
			} else {
				const matchingProtocols = protocols
					.filter((p) => p.category && selectedCategoriesSet.has(p.category))
					.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

				filtered = matchingProtocols.map((protocol) => ({
					value: protocol.slug,
					label: protocol.name,
					logo: protocol.logo || `https://icons.llamao.fi/icons/protocols/${protocol.slug}?w=48&h=48`
				}))
			}
		}

		if (search.trim()) {
			const searchLower = search.toLowerCase()
			filtered = filtered.filter((o) => o.label.toLowerCase().includes(searchLower))
		}

		return filtered
	}, [options, search, selectedCategoriesSet, state.comparisonType, chainCategoryData, protocols])

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => listRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	const typeLabel = state.comparisonType === 'chains' ? 'Chains' : 'Protocols'

	const handleToggle = (value: string) => {
		actions.toggleSelectedItem(value, 10)
	}

	const handleRemoveItem = (item: string) => {
		actions.toggleSelectedItem(item)
	}

	const optionsMap = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])

	const selectedLabels = useMemo(() => {
		return state.selectedItems.map((item) => {
			const option = optionsMap.get(item)
			return { value: item, label: option?.label || item, logo: option?.logo }
		})
	}, [state.selectedItems, optionsMap])

	const selectedItemsSet = useMemo(() => new Set(state.selectedItems), [state.selectedItems])

	useEffect(() => {
		setSelectedCategories([])
	}, [state.comparisonType])

	return (
		<div className="flex flex-col gap-4">
			<div className="text-center">
				<h2 className="text-lg font-semibold text-(--text-primary)">Select {typeLabel}</h2>
				<p className="mt-1 text-sm text-(--text-secondary)">Choose 1-10 {typeLabel.toLowerCase()} for your dashboard</p>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-(--text-secondary)">
						Selected ({state.selectedItems.length}/10)
					</span>
					<button
						type="button"
						onClick={() => actions.setSelectedItems([])}
						className={`text-xs text-(--text-tertiary) hover:text-(--primary) ${state.selectedItems.length === 0 ? 'invisible' : ''}`}
					>
						Clear all
					</button>
				</div>
				<div className="relative">
					<div className="flex h-[32px] items-center gap-2 overflow-x-auto scroll-smooth pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{state.selectedItems.length > 0 ? (
							selectedLabels.map((item) => (
								<div
									key={item.value}
									className="flex shrink-0 items-center gap-2 rounded-full border border-(--cards-border) bg-(--cards-bg-alt)/50 py-1 pr-1 pl-2 text-sm"
								>
									{item.logo && (
										<Image
											src={item.logo}
											alt={item.label}
											width={20}
											height={20}
											unoptimized
											className="h-5 w-5 rounded-full object-cover"
										/>
									)}
									<span className="whitespace-nowrap text-(--text-primary)">{item.label}</span>
									<button
										type="button"
										onClick={() => handleRemoveItem(item.value)}
										className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--cards-bg-alt) text-(--text-tertiary) transition-colors hover:bg-red-500/20 hover:text-red-500"
									>
										<Icon name="x" height={12} width={12} />
									</button>
								</div>
							))
						) : (
							<span className="text-sm text-(--text-tertiary)">No {typeLabel.toLowerCase()} selected</span>
						)}
					</div>
					{state.selectedItems.length > 2 && (
						<div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-(--cards-bg) to-transparent" />
					)}
				</div>
			</div>

			<div className="flex flex-col overflow-hidden rounded-lg border border-(--cards-border)">
				<div className="border-b border-(--cards-border) bg-(--cards-bg-alt)/30 p-2">
					<div className="mb-2">
						<AriakitMultiSelect
							label="Filter by Category"
							options={
								state.comparisonType === 'chains'
									? (chainCategoriesList || []).map((c) => ({ value: c, label: c }))
									: protocolCategoryOptions
							}
							selectedValues={selectedCategories}
							onChange={setSelectedCategories}
							placeholder="All categories"
							maxSelections={5}
						/>
					</div>
					<div className="relative">
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-1/2 left-3 -translate-y-1/2 text-(--text-tertiary)"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={`Search ${typeLabel.toLowerCase()}...`}
							className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-2 pr-3 pl-9 text-sm placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>

				<div ref={listRef} className="thin-scrollbar h-[280px] overflow-y-auto bg-(--cards-bg)">
					{protocolsLoading ? (
						<div className="flex h-full items-center justify-center">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-(--primary) border-t-transparent" />
						</div>
					) : filteredOptions.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-(--text-tertiary)">
							<Icon name="search" height={24} width={24} />
							<span className="text-sm">No {typeLabel.toLowerCase()} found</span>
						</div>
					) : (
						<div
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								width: '100%',
								position: 'relative'
							}}
						>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const option = filteredOptions[virtualRow.index]
								const isDirectlySelected = selectedItemsSet.has(option.value)
								const isParentSelected = option.isChild && option.parentSlug && selectedItemsSet.has(option.parentSlug)
								const isSelected = isDirectlySelected || isParentSelected
								const isDisabledByParent = isParentSelected && !isDirectlySelected
								const isDisabledByLimit = !isSelected && selectedItemsSet.size >= 10
								const isDisabled = isDisabledByParent || isDisabledByLimit

								return (
									<button
										key={option.value}
										type="button"
										onClick={() => !isDisabled && handleToggle(option.value)}
										disabled={isDisabled}
										className={`absolute top-0 left-0 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
											isSelected
												? 'bg-(--primary)/10'
												: isDisabled
													? 'cursor-not-allowed opacity-50'
													: 'hover:bg-(--cards-bg-alt)'
										} ${option.isChild ? 'pl-8' : ''}`}
										style={{
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`
										}}
									>
										<div
											className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
												isSelected
													? 'border-(--primary) bg-(--primary)'
													: 'border-(--form-control-border) bg-(--bg-input)'
											}`}
										>
											{isSelected && <Icon name="check" height={10} width={10} className="text-white" />}
										</div>

										<Image
											src={option.logo}
											alt={option.label}
											width={24}
											height={24}
											unoptimized
											className={`h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-(--cards-border) ${
												option.isChild ? 'opacity-70' : ''
											}`}
										/>

										<div className="min-w-0 flex-1">
											<span
												className={`truncate ${option.isChild ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}
											>
												{option.label}
											</span>
										</div>
									</button>
								)
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
