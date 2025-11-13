import { useMemo } from 'react'
import { AriakitSelect } from '~/containers/ProDashboard/components/AriakitSelect'
import { AriakitVirtualizedMultiSelect } from '~/containers/ProDashboard/components/AriakitVirtualizedMultiSelect'
import { useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import type { TableFilters, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { getItemIconUrl } from '~/containers/ProDashboard/utils'
import { buildProtocolOptions } from '~/containers/ProDashboard/utils/buildProtocolOptions'

type StrategyType = UnifiedTableConfig['strategyType']

interface FiltersPanelProps {
	strategyType: StrategyType
	chains: string[]
	category: string | null
	filters: TableFilters
	availableChains: Array<{ label: string; value: string }>
	onChainsChange: (chains: string[]) => void
	onCategoryChange: (category: string | null) => void
	onFiltersChange: (filters: TableFilters) => void
}

export function FiltersPanel({
	strategyType,
	chains,
	category,
	filters,
	availableChains,
	onChainsChange,
	onCategoryChange,
	onFiltersChange
}: FiltersPanelProps) {
	const { protocols } = useProDashboard()

	const chainSelectOptions = useMemo(() => {
		if (availableChains.some((option) => option.value === 'All')) {
			return availableChains
		}

		return [{ value: 'All', label: 'All Chains' }, ...availableChains]
	}, [availableChains])

	const chainCategoryOptions = useMemo(
		() => [
			{ value: 'All', label: 'All Chains' },
			{ value: 'EVM', label: 'EVM Chains' },
			{ value: 'non-EVM', label: 'Non-EVM Chains' },
			{ value: 'Layer 2', label: 'Layer 2' },
			{ value: 'Rollup', label: 'Rollups' },
			{ value: 'Parachain', label: 'Parachains' },
			{ value: 'Cosmos', label: 'Cosmos' }
		],
		[]
	)

	const selectedChainValues = useMemo<string[]>(() => {
		if (chains.includes('All')) {
			return ['All']
		}

		return chains
	}, [chains])

	const selectedCategoryValue = category ?? 'All'

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
		const list = protocols.map((protocol) => ({
			name: protocol.name,
			tvl: protocol.tvl ?? 0,
			parentProtocol: protocol.parentProtocol ?? null,
			logo: protocol.logo,
			defillamaId: protocol.id
		}))
		return buildProtocolOptions(list, [], 'name').options
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
		<div className="thin-scrollbar flex max-h-[350px] flex-col gap-2 overflow-y-auto">
			{strategyType === 'protocols' ? (
				<AriakitVirtualizedMultiSelect
					label="Chains"
					options={chainSelectOptions}
					selectedValues={selectedChainValues}
					onChange={handleChainMultiSelectChange}
					placeholder="All chains..."
					renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
					className="flex flex-col gap-1.5"
				/>
			) : (
				<AriakitSelect
					label="Chain Category"
					options={chainCategoryOptions}
					selectedValue={selectedCategoryValue}
					onChange={(option) => onCategoryChange(option.value === 'All' ? null : option.value)}
					placeholder="All categories..."
				/>
			)}
			<AriakitVirtualizedMultiSelect
				label="Include Categories"
				options={categoryOptions}
				selectedValues={(filters.categories as string[]) ?? []}
				onChange={(values) => handleMultiSelectChange('categories', values)}
				placeholder="All categories..."
				className="flex flex-col gap-1.5"
			/>
			<AriakitVirtualizedMultiSelect
				label="Exclude Categories"
				options={categoryOptions}
				selectedValues={(filters.excludedCategories as string[]) ?? []}
				onChange={(values) => handleMultiSelectChange('excludedCategories', values)}
				placeholder="None"
				className="flex flex-col gap-1.5"
			/>
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
	)
}
