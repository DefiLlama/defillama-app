import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import { Icon } from '~/components/Icon'
import { AriakitSelect } from '~/containers/ProDashboard/components/AriakitSelect'
import { AriakitVirtualizedMultiSelect } from '~/containers/ProDashboard/components/AriakitVirtualizedMultiSelect'
import { useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { getItemIconUrl } from '~/containers/ProDashboard/utils'
import { buildProtocolOptions } from '~/containers/ProDashboard/utils/buildProtocolOptions'
import { useUnifiedTableWizardContext } from '../WizardContext'

interface StrategyScopeStepProps {
	availableChains: Array<{ label: string; value: string }>
	onNext: () => void
	onBack?: () => void
}

const PROTOCOL_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol']
const CHAIN_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain']

type StrategyType = UnifiedTableConfig['strategyType']

type IconName = ComponentProps<typeof Icon>['name']

const STRATEGY_OPTIONS: Array<{
	value: StrategyType
	label: string
	description: string
	icon: 'protocol' | 'chain'
}> = [
	{
		value: 'protocols',
		label: 'Protocols',
		description: 'Compare and group individual protocols across multiple chains.',
		icon: 'protocol'
	},
	{
		value: 'chains',
		label: 'Chains',
		description: 'Focus on chain-level insights and ecosystem-wide performance.',
		icon: 'chain'
	}
]

export function StrategyScopeStep({ availableChains, onNext, onBack }: StrategyScopeStepProps) {
	const {
		state: { strategyType, chains, category, rowHeaders, filters },
		actions: { setStrategy, setChains, setCategory, setRowHeaders, setFilters }
	} = useUnifiedTableWizardContext()
	const { protocols } = useProDashboard()

	const [localFilters, setLocalFilters] = useState<TableFilters>(() => {
		const next = { ...filters }
		delete next.tvlMin
		delete next.tvlMax
		return next
	})

	useEffect(() => {
		const next = { ...filters }
		delete next.tvlMin
		delete next.tvlMax
		setLocalFilters(next)
	}, [filters])

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
		const next: TableFilters = { ...localFilters }
		if (values.length === 0) {
			delete next[key]
		} else {
			next[key] = values
		}
		setLocalFilters(next)
	}

	const formatGroupingLabel = (header: UnifiedRowHeaderType) => {
		if (header === 'parent-protocol') {
			return 'Protocol'
		}

		return header
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	}

	const GROUPING_ICON_BY_KEY: Partial<Record<UnifiedRowHeaderType, IconName>> = {
		chain: 'chain',
		category: 'tag',
		'parent-protocol': 'protocol'
	}

	const groupingOptions = useMemo(() => {
		const baseOrder = strategyType === 'protocols' ? PROTOCOL_ROW_HEADER_ORDER : CHAIN_ROW_HEADER_ORDER

		return baseOrder.map((header) => ({
			value: header,
			label: formatGroupingLabel(header),
			icon: GROUPING_ICON_BY_KEY[header],
			description:
				header === 'chain'
					? 'Group rows by blockchain ecosystem.'
					: header === 'category'
						? 'Break protocols down by sector classification.'
						: 'Combine child protocols under their parent project.'
		}))
	}, [strategyType])

	const handleChainMultiSelectChange = (values: string[]) => {
		if (values.length === 0) {
			setChains(['All'])
			return
		}

		if (values.includes('All')) {
			if (!chains.includes('All')) {
				setChains(['All'])
				return
			}

			if (values.length === 1) {
				setChains(['All'])
				return
			}

			const filtered = values.filter((value) => value !== 'All')
			setChains(filtered.length ? filtered : ['All'])
			return
		}

		setChains(values)
	}

	const handleToggleRowHeader = (header: UnifiedRowHeaderType) => {
		if (strategyType === 'chains') {
			setRowHeaders([...CHAIN_ROW_HEADER_ORDER])
			return
		}

		const currentlySelected = new Set(rowHeaders)

		if (currentlySelected.has(header)) {
			if (currentlySelected.size === 1) {
				return
			}

			currentlySelected.delete(header)
		} else {
			currentlySelected.add(header)
		}

		const next = PROTOCOL_ROW_HEADER_ORDER.filter((item) => currentlySelected.has(item))

		setRowHeaders(next)
	}

	const hasFilters = useMemo(() => Object.keys(localFilters).length > 0, [localFilters])
	const categoriesCount = (localFilters.categories as string[] | undefined)?.length ?? 0
	const excludedCategoriesCount = (localFilters.excludedCategories as string[] | undefined)?.length ?? 0
	const protocolsCount = (localFilters.protocols as string[] | undefined)?.length ?? 0
	const oraclesCount = (localFilters.oracles as string[] | undefined)?.length ?? 0
	const scopeCount = useMemo(() => {
		if (strategyType === 'protocols') {
			return chains.includes('All') ? 0 : 1
		}
		return category && category !== 'All' ? 1 : 0
	}, [strategyType, chains, category])

	const groupingSummary = useMemo(() => {
		const labels =
			strategyType === 'chains' ? CHAIN_ROW_HEADER_ORDER : rowHeaders.length ? rowHeaders : PROTOCOL_ROW_HEADER_ORDER

		return labels.map((header) => formatGroupingLabel(header)).join(' → ')
	}, [rowHeaders, strategyType])

	const handleClearFilters = () => {
		setLocalFilters({})
	}

	const handleNext = () => {
		const nextFilters = { ...localFilters }
		delete nextFilters.tvlMin
		delete nextFilters.tvlMax
		setFilters(nextFilters)
		onNext()
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<section className="flex flex-col gap-3 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3 shadow-sm">
					<div className="flex flex-col gap-1">
						<h3 className="text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
							Strategy & Grouping
						</h3>
						<p className="text-xs text-(--text-secondary)">Decide the data perspective and row hierarchy.</p>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						{STRATEGY_OPTIONS.map((option) => {
							const active = strategyType === option.value
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => setStrategy(option.value)}
									aria-pressed={active}
									className={`group flex h-full flex-col gap-1.5 rounded-lg border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
										active
											? 'border-(--primary) bg-(--primary)/12 shadow-[0_4px_10px_rgba(91,133,255,0.12)]'
											: 'border-(--cards-border) hover:border-(--primary) hover:bg-(--primary)/6'
									}`}
								>
									<span className="flex items-center gap-1.5">
										<Icon
											height={16}
											width={16}
											name={option.icon}
											className={active ? 'text-(--primary)' : 'text-(--text-tertiary)'}
										/>
										<span className="text-sm font-semibold text-(--text-primary)">{option.label}</span>
									</span>
									<p className="text-[11px] text-(--text-secondary)">{option.description}</p>
								</button>
							)
						})}
					</div>
					<div className="rounded-md border border-(--cards-border)/70 bg-(--cards-bg-alt)/50 px-3 py-2 text-[11px] text-(--text-tertiary)">
						<strong className="text-(--text-secondary)">Grouping:</strong> {groupingSummary}
					</div>
					<div className="grid gap-2 border-t border-(--cards-border)/70 pt-3 sm:grid-cols-2">
						{groupingOptions.map((option) => {
							const active = rowHeaders.includes(option.value)
							const disabled = strategyType === 'chains'
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => !disabled && handleToggleRowHeader(option.value)}
									aria-pressed={active}
									disabled={disabled}
									className={`group flex h-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
										active
											? 'border-(--primary) bg-(--primary)/12 shadow-[0_2px_6px_rgba(91,133,255,0.1)]'
											: 'border-(--cards-border) hover:border-(--primary) hover:bg-(--primary)/6'
									} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
								>
									<span className="flex items-center gap-1.5">
										{option.icon && (
											<Icon
												height={15}
												width={15}
												name={option.icon}
												className={active ? 'text-(--primary)' : 'text-(--text-tertiary)'}
											/>
										)}
										<span className="text-[11px] font-semibold text-(--text-primary)">{option.label}</span>
										{active && <Icon name="check" height={12} width={12} className="text-(--primary)" />}
									</span>
									<p className="text-[11px] leading-tight text-(--text-secondary)">{option.description}</p>
								</button>
							)
						})}
					</div>
				</section>

				<section className="flex flex-col gap-3 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3 shadow-sm">
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-1">
							<h3 className="text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">Filters</h3>
							<p className="text-xs text-(--text-secondary)">Narrow the dataset by scope and filters.</p>
						</div>
						{scopeCount + categoriesCount + excludedCategoriesCount + protocolsCount + oraclesCount > 0 && (
							<span className="rounded-full border border-(--primary)/30 bg-(--primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--primary)">
								{scopeCount + categoriesCount + excludedCategoriesCount + protocolsCount + oraclesCount} active
							</span>
						)}
					</div>

					<div className="thin-scrollbar flex max-h-[400px] flex-col gap-2 overflow-y-auto">
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
								onChange={(option) => setCategory(option.value === 'All' ? null : option.value)}
								placeholder="All categories..."
							/>
						)}
						<AriakitVirtualizedMultiSelect
							label="Include Categories"
							options={categoryOptions}
							selectedValues={(localFilters.categories as string[]) ?? []}
							onChange={(values) => handleMultiSelectChange('categories', values)}
							placeholder="All categories..."
							className="flex flex-col gap-1.5"
						/>
						<AriakitVirtualizedMultiSelect
							label="Exclude Categories"
							options={categoryOptions}
							selectedValues={(localFilters.excludedCategories as string[]) ?? []}
							onChange={(values) => handleMultiSelectChange('excludedCategories', values)}
							placeholder="None"
							className="flex flex-col gap-1.5"
						/>
						<AriakitVirtualizedMultiSelect
							label="Protocols"
							options={protocolOptions}
							selectedValues={(localFilters.protocols as string[]) ?? []}
							onChange={(values) => handleMultiSelectChange('protocols', values)}
							placeholder="All protocols..."
							renderIcon={(option) => option.logo || getItemIconUrl('protocol', option, option.value)}
							className="flex flex-col gap-1.5"
						/>
						<AriakitVirtualizedMultiSelect
							label="Oracles"
							options={oracleOptions}
							selectedValues={(localFilters.oracles as string[]) ?? []}
							onChange={(values) => handleMultiSelectChange('oracles', values)}
							placeholder="All oracles..."
							className="flex flex-col gap-1.5"
						/>
					</div>
				</section>
			</div>

			<div className="sticky right-0 bottom-0 left-0 flex w-full max-w-full items-center justify-between gap-3 border-t border-(--cards-border) bg-(--cards-bg) px-3 pt-3 pb-4 shadow-[0_-8px_16px_rgba(10,13,20,0.25)]/10 md:gap-4 md:px-4">
				<button
					type="button"
					onClick={handleClearFilters}
					className="text-xs text-(--text-tertiary) underline decoration-dotted underline-offset-4 transition hover:text-(--text-secondary) disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!hasFilters}
				>
					Clear all filters
				</button>
				<div className="flex items-center gap-2">
					{onBack ? (
						<button
							type="button"
							onClick={onBack}
							className="pro-border pro-text2 hover:pro-text1 pro-hover-bg rounded-md border px-4 py-2 text-sm transition"
						>
							Back
						</button>
					) : null}
					<button
						type="button"
						onClick={handleNext}
						className="pro-btn-blue flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
					>
						Continue
						<Icon name="arrow-right" height={14} width={14} />
					</button>
				</div>
			</div>
		</div>
	)
}
