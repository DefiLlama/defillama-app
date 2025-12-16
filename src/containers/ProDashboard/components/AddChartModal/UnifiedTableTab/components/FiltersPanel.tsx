import { useMemo, useState } from 'react'
import { AriakitVirtualizedMultiSelect } from '~/containers/ProDashboard/components/AriakitVirtualizedMultiSelect'
import { useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import type { TableFilters } from '~/containers/ProDashboard/types'
import { getItemIconUrl } from '~/containers/ProDashboard/utils'

interface FiltersPanelProps {
	chains: string[]
	filters: TableFilters
	availableChains: Array<{ label: string; value: string }>
	onChainsChange: (chains: string[]) => void
	onFiltersChange: (filters: TableFilters) => void
}

export function FiltersPanel({ chains, filters, availableChains, onChainsChange, onFiltersChange }: FiltersPanelProps) {
	const { protocols } = useProDashboard()
	const [categoryMode, setCategoryMode] = useState<'include' | 'exclude'>('include')

	const chainSelectOptions = useMemo(() => {
		if (availableChains.some((option) => option.value === 'All')) {
			return availableChains
		}

		return [{ value: 'All', label: 'All Chains' }, ...availableChains]
	}, [availableChains])

	const selectedChainValues = useMemo<string[]>(() => {
		if (chains.includes('All')) {
			return ['All']
		}

		return chains
	}, [chains])

	const categoryOptions = useMemo(() => {
		if (!protocols || protocols.length === 0) return []
		const set = new Set<string>()
		for (const protocol of protocols) {
			const protocolCategory = (protocol as any).category as string | undefined
			if (protocolCategory) set.add(protocolCategory)
		}
		return Array.from(set)
			.sort((a, b) => a.localeCompare(b))
			.map((item) => ({ value: item, label: item }))
	}, [protocols])

	const protocolOptions = useMemo(() => {
		if (!protocols || protocols.length === 0) return []

		const childrenByParentId = new Map<string, typeof protocols>()
		const parentsOrSolo: typeof protocols = []

		for (const protocol of protocols) {
			if (protocol.parentProtocol) {
				const arr = childrenByParentId.get(protocol.parentProtocol) || []
				arr.push(protocol)
				childrenByParentId.set(protocol.parentProtocol, arr)
			} else {
				parentsOrSolo.push(protocol)
			}
		}

		parentsOrSolo.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const options: Array<{ value: string; label: string; logo?: string; isChild?: boolean }> = []

		for (const parent of parentsOrSolo) {
			const childProtocols = (childrenByParentId.get(parent.id) || []).sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			options.push({ value: parent.name, label: parent.name, logo: parent.logo })
			for (const child of childProtocols) {
				options.push({ value: child.name, label: child.name, logo: child.logo, isChild: true })
			}
		}

		return options
	}, [protocols])

	const oracleOptions = useMemo(() => {
		if (!protocols || protocols.length === 0) return []
		const totals = new Map<string, number>()
		const add = (oracle: string, weight: number) => {
			if (!oracle) return
			totals.set(oracle, (totals.get(oracle) || 0) + weight)
		}

		for (const protocol of protocols as any[]) {
			const weight = Number(protocol?.tvl) || 0
			if (Array.isArray(protocol?.oracles)) {
				protocol.oracles.forEach((oracle: string) => add(oracle, weight))
			}
			if (protocol?.oraclesByChain) {
				Object.values(protocol.oraclesByChain as Record<string, string[]>)
					.flat()
					.forEach((oracle: string) => add(oracle, weight))
			}
		}

		return Array.from(totals.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([oracle]) => ({ value: oracle, label: oracle }))
	}, [protocols])

	const includeCategories = (filters.categories as string[]) ?? []
	const excludeCategories = (filters.excludedCategories as string[]) ?? []
	const categoryValues = categoryMode === 'include' ? includeCategories : excludeCategories

	const handleMultiSelectChange = (
		key: 'categories' | 'excludedCategories' | 'protocols' | 'oracles',
		values: string[]
	) => {
		const next: TableFilters = { ...filters }
		if (values.length === 0) {
			delete next[key]
		} else {
			next[key] = values
		}
		onFiltersChange(next)
	}

	const handleCategoryMultiSelectChange = (values: string[]) => {
		const key = categoryMode === 'include' ? 'categories' : 'excludedCategories'
		const next: TableFilters = { ...filters }
		if (values.length === 0) {
			delete next[key]
		} else {
			next[key] = values
		}
		onFiltersChange(next)
	}

	const handleChainMultiSelectChange = (values: string[]) => {
		if (values.length === 0) {
			onChainsChange(['All'])
			return
		}

		if (values.includes('All')) {
			if (!chains.includes('All')) {
				onChainsChange(['All'])
				return
			}

			if (values.length === 1) {
				onChainsChange(['All'])
				return
			}

			const filtered = values.filter((value) => value !== 'All')
			onChainsChange(filtered.length ? filtered : ['All'])
			return
		}

		onChainsChange(values)
	}

	return (
		<div className="thin-scrollbar max-h-[350px] overflow-y-auto">
			<div className="grid gap-3 md:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<AriakitVirtualizedMultiSelect
						label="Chains"
						options={chainSelectOptions}
						selectedValues={selectedChainValues}
						onChange={handleChainMultiSelectChange}
						placeholder="All chains..."
						renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
					/>
				</div>
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 md:col-span-2">
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<div>
							<p className="text-xs font-semibold text-(--text-secondary)">Categories</p>
							<p className="text-[11px] text-(--text-tertiary)">Toggle include or exclude selections.</p>
						</div>
						<div className="flex items-center rounded-md border border-(--cards-border)">
							{(['include', 'exclude'] as const).map((mode) => {
								const isActive = categoryMode === mode
								const count = mode === 'include' ? includeCategories.length : excludeCategories.length
								return (
									<button
										type="button"
										key={mode}
										onClick={() => setCategoryMode(mode)}
										className={`px-2 py-1 text-[11px] font-medium transition ${
											isActive
												? 'bg-(--primary)/10 text-(--primary)'
												: 'text-(--text-tertiary) hover:text-(--text-primary)'
										}`}
									>
										{mode === 'include' ? 'Include' : 'Exclude'}
										{count > 0 ? <span className="ml-1 text-[10px] text-(--text-tertiary)">({count})</span> : null}
									</button>
								)
							})}
						</div>
					</div>
					<AriakitVirtualizedMultiSelect
						label={categoryMode === 'include' ? 'Include Categories' : 'Exclude Categories'}
						options={categoryOptions}
						selectedValues={categoryValues}
						onChange={handleCategoryMultiSelectChange}
						placeholder={categoryMode === 'include' ? 'All categories...' : 'None'}
						className="[&>label]:sr-only"
					/>
				</div>
				<AriakitVirtualizedMultiSelect
					label="Protocols"
					options={protocolOptions}
					selectedValues={(filters.protocols as string[]) ?? []}
					onChange={(values) => handleMultiSelectChange('protocols', values)}
					placeholder="All protocols..."
					renderIcon={(option) => option.logo || getItemIconUrl('protocol', option, option.value)}
					className="flex flex-col gap-1.5"
				/>
				<AriakitVirtualizedMultiSelect
					label="Oracles"
					options={oracleOptions}
					selectedValues={(filters.oracles as string[]) ?? []}
					onChange={(values) => handleMultiSelectChange('oracles', values)}
					placeholder="All oracles..."
					className="flex flex-col gap-1.5"
				/>
			</div>
		</div>
	)
}
