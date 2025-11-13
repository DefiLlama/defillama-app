import { useEffect, useMemo, useState } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import {
	UNIFIED_TABLE_PRESETS,
	UNIFIED_TABLE_PRESETS_BY_ID
} from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import {
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_UNIFIED_TABLE_SORTING
} from '~/containers/ProDashboard/components/UnifiedTable/constants'
import { ColumnManager } from '../components/ColumnManager'
import { PresetPicker } from '../components/PresetPicker'
import { SortingSelector } from '../components/SortingSelector'
import { useUnifiedTableWizardContext } from '../WizardContext'

interface PresetColumnsStepProps {
	onNext: () => void
	onBack: () => void
}

export function PresetColumnsStep({ onNext, onBack }: PresetColumnsStepProps) {
	const {
		state: { strategyType, activePresetId, columnOrder, columnVisibility, sorting, filters, chains, category },
		actions: { setPreset, setColumns, setSorting }
	} = useUnifiedTableWizardContext()

	const [localOrder, setLocalOrder] = useState<ColumnOrderState>(columnOrder)
	const [localVisibility, setLocalVisibility] = useState<VisibilityState>({ ...columnVisibility })
	const [localSorting, setLocalSorting] = useState<SortingState>(sorting)

	const activePreset = useMemo(() => UNIFIED_TABLE_PRESETS_BY_ID.get(activePresetId), [activePresetId])

	const allColumnsForStrategy = useMemo(() => {
		return [
			'name',
			...UNIFIED_TABLE_COLUMN_DICTIONARY.filter((column) => {
				if (column.strategies && !column.strategies.includes(strategyType)) return false
				return column.id !== 'name'
			}).map((column) => column.id)
		]
	}, [strategyType])

	const presetDefaults = useMemo(() => {
		const baseOrder = activePreset
			? [...activePreset.columnOrder]
			: [allColumnsForStrategy[0], ...allColumnsForStrategy.slice(1)]
		const baseVisibility = activePreset
			? { ...DEFAULT_COLUMN_VISIBILITY, ...activePreset.columnVisibility }
			: allColumnsForStrategy.reduce<VisibilityState>((acc, id) => {
					acc[id] = id === 'name'
					return acc
				}, {})
		const baseSorting =
			activePreset && activePreset.defaultSorting && activePreset.defaultSorting.length
				? activePreset.defaultSorting.map((item) => ({ id: item.id, desc: item.desc ?? false }))
				: DEFAULT_UNIFIED_TABLE_SORTING.map((item) => ({ ...item }))

		return {
			order: baseOrder,
			visibility: baseVisibility,
			sorting: baseSorting
		}
	}, [activePreset, allColumnsForStrategy])

	const presetSortingFallback = useMemo<SortingState>(() => {
		const base =
			activePreset?.defaultSorting && activePreset.defaultSorting.length
				? activePreset.defaultSorting
				: DEFAULT_UNIFIED_TABLE_SORTING
		return base.map((item) => ({ id: item.id, desc: item.desc ?? false }))
	}, [activePreset])

	const arraysEqual = (a: string[], b: string[]) => {
		if (a.length !== b.length) return false
		return a.every((value, index) => value === b[index])
	}

	const visibilityEqual = (a: VisibilityState, b: VisibilityState) => {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)])
		for (const key of keys) {
			const aValue = key in a ? a[key] : true
			const bValue = key in b ? b[key] : true
			if (Boolean(aValue) !== Boolean(bValue)) return false
		}
		return true
	}

	const sortingEqual = (a: SortingState, b: SortingState) => {
		if (a.length !== b.length) return false
		return a.every((item, index) => {
			const other = b[index]
			if (!other) return false
			return item.id === other.id && Boolean(item.desc) === Boolean(other.desc)
		})
	}

	const isModified =
		!arraysEqual(localOrder, presetDefaults.order) ||
		!visibilityEqual(localVisibility, presetDefaults.visibility) ||
		!sortingEqual(localSorting, presetDefaults.sorting)

	const visibleColumnsCount = useMemo(
		() => localOrder.filter((id) => id !== 'name' && (localVisibility[id] ?? true)).length,
		[localOrder, localVisibility]
	)

	const recommendedPresetIds = useMemo(() => {
		const ids = new Set<string>()
		const addPreset = (presetId: string) => {
			const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
			if (!preset || preset.strategyType !== strategyType) return
			ids.add(presetId)
		}

		const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

		const includeCategories = Array.isArray(filters.categories) ? (filters.categories as string[]) : []
		const excludeCategories = Array.isArray(filters.excludedCategories) ? (filters.excludedCategories as string[]) : []
		const combinedCategories = [...includeCategories, ...excludeCategories].map(normalizeValue)
		const normalizedCategorySet = new Set(combinedCategories)

		const protocolFilters = Array.isArray(filters.protocols) ? (filters.protocols as string[]) : []
		const normalizedProtocols = protocolFilters.map(normalizeValue)

		const normalizedChains = chains.map(normalizeValue)
		const selectedCategory = category ? normalizeValue(category) : null

		const hasOracles = Array.isArray(filters.oracles) && filters.oracles.length > 0
		const hasRewards = Boolean(filters.hasRewards)
		const hasActiveLending = Boolean(filters.activeLending)

		const CATEGORY_PRESET_MAP: Record<string, string[]> = {
			dexs: ['volume-protocols'],
			'dex aggregator': ['aggregators-protocols'],
			options: ['options-protocols'],
			'exotic options': ['options-protocols'],
			'options vault': ['options-protocols'],
			derivatives: ['perps-protocols'],
			perps: ['perps-protocols'],
			bridge: ['bridge-aggregators-protocols'],
			'bridge aggregator': ['bridge-aggregators-protocols'],
			'cross chain bridge': ['bridge-aggregators-protocols'],
			yield: ['revenue-protocols'],
			'yield aggregator': ['revenue-protocols'],
			'yield lottery': ['revenue-protocols'],
			'liquid staking': ['revenue-protocols'],
			'liquid restaking': ['revenue-protocols'],
			restaking: ['revenue-protocols'],
			lending: ['fees-protocols', 'revenue-protocols'],
			'uncollateralized lending': ['fees-protocols', 'revenue-protocols'],
			cdp: ['revenue-protocols'],
			'cdp manager': ['revenue-protocols'],
			'stablecoin issuer': ['revenue-protocols'],
			rwa: ['revenue-protocols'],
			'rwa lending': ['revenue-protocols'],
			synthetics: ['growth-protocols'],
			'leveraged farming': ['growth-protocols'],
			farm: ['growth-protocols'],
			insurance: ['revenue-protocols'],
			mev: ['growth-protocols'],
			oracle: ['perps-protocols']
		}

		const PROTOCOL_KEYWORD_PRESETS: Array<{ keywords: string[]; presets: string[] }> = [
			{
				keywords: ['uniswap', 'sushi', 'balancer', 'curve', 'pancake', 'raydium', 'spooky'],
				presets: ['volume-protocols']
			},
			{
				keywords: ['gmx', 'dydx', 'perp', 'perpetual', 'kwenta', 'hyperliquid', 'polynomial'],
				presets: ['perps-protocols']
			},
			{
				keywords: ['lyra', 'dopex', 'premia', 'aevo', 'ribbon', 'hemera', 'zeta'],
				presets: ['options-protocols']
			},
			{
				keywords: ['1inch', 'paraswap', 'matcha', 'rubic', 'lifi', 'zapper', 'metafi'],
				presets: ['aggregators-protocols']
			},
			{
				keywords: ['stargate', 'synapse', 'across', 'wormhole', 'hop', 'debridge'],
				presets: ['bridge-aggregators-protocols']
			},
			{
				keywords: ['maker', 'aave', 'compound', 'frax', 'liquity', 'spark', 'morpho'],
				presets: ['revenue-protocols', 'fees-protocols']
			}
		]

		const CHAIN_KEYWORD_PRESETS: Record<string, string[]> = {
			evm: ['chains-growth'],
			'layer 2': ['chains-growth', 'chains-fees'],
			rollup: ['chains-growth', 'chains-fees'],
			parachain: ['chains-growth'],
			cosmos: ['chains-fees']
		}

		if (strategyType === 'protocols') {
			addPreset('essential-protocols')
			addPreset('growth-protocols')
			addPreset('fees-protocols')
			addPreset('revenue-protocols')

			combinedCategories.forEach((categoryValue) => {
				Object.entries(CATEGORY_PRESET_MAP).forEach(([matchKey, presets]) => {
					if (categoryValue.includes(matchKey)) {
						presets.forEach(addPreset)
					}
				})
			})

			PROTOCOL_KEYWORD_PRESETS.forEach(({ keywords, presets }) => {
				if (keywords.some((keyword) => normalizedProtocols.some((protocol) => protocol.includes(keyword)))) {
					presets.forEach(addPreset)
				}
			})

			if (normalizedCategorySet.has('dex aggregator')) {
				addPreset('aggregators-protocols')
			}

			if (normalizedCategorySet.has('options') || normalizedCategorySet.has('exotic options')) {
				addPreset('options-protocols')
			}

			if (normalizedCategorySet.has('bridge aggregator')) {
				addPreset('bridge-aggregators-protocols')
			}

			if (normalizedCategorySet.has('oracle') || hasOracles) {
				addPreset('perps-protocols')
			}

			if (hasRewards || hasActiveLending) {
				addPreset('growth-protocols')
				addPreset('revenue-protocols')
			}

			if (normalizedChains.some((value) => value !== 'all')) {
				addPreset('volume-protocols')
				addPreset('revenue-protocols')
			}
		} else {
			addPreset('chains-essential')
			addPreset('chains-growth')
			addPreset('chains-fees')

			if (selectedCategory && selectedCategory !== 'all') {
				Object.entries(CHAIN_KEYWORD_PRESETS).forEach(([matchKey, presets]) => {
					if (selectedCategory.includes(matchKey)) {
						presets.forEach(addPreset)
					}
				})
			}

			if (chains.length > 0 && !chains.includes('All')) {
				addPreset('chains-growth')
			}
		}

		return Array.from(ids).filter((id) => {
			const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(id)
			if (!preset) return false
			return preset.strategyType === strategyType
		})
	}, [
		strategyType,
		filters.categories,
		filters.excludedCategories,
		filters.protocols,
		filters.oracles,
		filters.hasRewards,
		filters.activeLending,
		chains,
		category
	])

	const recommendedPresetSet = useMemo(() => new Set(recommendedPresetIds), [recommendedPresetIds])

	const recommendedPresets = useMemo(
		() => UNIFIED_TABLE_PRESETS.filter((preset) => recommendedPresetSet.has(preset.id)),
		[recommendedPresetSet]
	)

	const otherPresets = useMemo(
		() =>
			UNIFIED_TABLE_PRESETS.filter(
				(preset) => preset.strategyType === strategyType && !recommendedPresetSet.has(preset.id)
			),
		[strategyType, recommendedPresetSet]
	)

	const handlePresetSelect = (presetId: string) => {
		setPreset(presetId)
		const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
		if (preset) {
			setLocalOrder([...preset.columnOrder])
			setLocalVisibility({ ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility })
			const nextSorting =
				preset.defaultSorting && preset.defaultSorting.length
					? preset.defaultSorting.map((item) => ({ id: item.id, desc: item.desc ?? false }))
					: DEFAULT_UNIFIED_TABLE_SORTING.map((item) => ({ ...item }))
			setLocalSorting(nextSorting)
		}
	}

	const handleResetToPreset = () => {
		if (!activePreset) return
		handlePresetSelect(activePreset.id)
		setColumns(presetDefaults.order, presetDefaults.visibility)
		setSorting(presetDefaults.sorting)
	}

	const handleClearColumns = () => {
		const nextVisibility = allColumnsForStrategy.reduce<VisibilityState>((acc, id) => {
			acc[id] = id === 'name'
			return acc
		}, {})

		const nextOrder: ColumnOrderState = ['name']

		setLocalOrder(nextOrder)
		setLocalVisibility(nextVisibility)
		setLocalSorting([])
		setColumns(nextOrder, nextVisibility)
		setSorting([])
	}

	const handleColumnChange = (order: ColumnOrderState, visibility: VisibilityState) => {
		setLocalOrder(order)
		setLocalVisibility(visibility)
	}

	useEffect(() => {
		setLocalOrder(columnOrder)
	}, [columnOrder])

	useEffect(() => {
		setLocalVisibility({ ...columnVisibility })
	}, [columnVisibility])

	useEffect(() => {
		setLocalSorting(sorting)
	}, [sorting])

	const handleNext = () => {
		setColumns(localOrder, localVisibility)
		setSorting(localSorting)
		onNext()
	}

	return (
		<div className="flex flex-col gap-6">
			{recommendedPresets.length > 0 ? (
				<section className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-(--text-primary)">Recommended for You</h3>
						<p className="text-[11px] text-(--text-tertiary)">Suggestions based on your current scope and filters.</p>
					</div>
					<PresetPicker
						strategyType={strategyType}
						activePresetId={activePresetId}
						onSelect={handlePresetSelect}
						presets={recommendedPresets}
					/>
				</section>
			) : null}

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-(--text-primary)">Preset</h3>
				{otherPresets.length > 0 ? (
					<PresetPicker
						strategyType={strategyType}
						activePresetId={activePresetId}
						onSelect={handlePresetSelect}
						presets={otherPresets}
					/>
				) : (
					<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-tertiary)">
						All available presets are highlighted above.
					</div>
				)}
				<p className="text-xs text-(--text-tertiary)">
					Choosing a preset instantly updates grouping, default sorting, and which metrics are visible.
				</p>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-(--text-primary)">Sorting</h3>
				<SortingSelector
					columnOrder={localOrder}
					columnVisibility={localVisibility}
					sorting={localSorting}
					onChange={setLocalSorting}
					onReset={() => setLocalSorting(presetSortingFallback)}
				/>
			</section>

			<section className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h3 className="text-sm font-semibold text-(--text-primary)">Columns</h3>
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<button
							type="button"
							onClick={handleResetToPreset}
							disabled={!isModified}
							className={`rounded-md border px-3 py-1 transition ${
								isModified
									? 'border-(--primary) text-(--primary) hover:bg-(--primary)/10'
									: 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
							}`}
						>
							Reset to preset
						</button>
						<button
							type="button"
							onClick={handleClearColumns}
							disabled={visibleColumnsCount === 0}
							className={`rounded-md border px-3 py-1 transition ${
								visibleColumnsCount === 0
									? 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
									: 'border-red-500/60 text-red-500 hover:bg-red-500/10'
							}`}
						>
							Clear all
						</button>
					</div>
				</div>
				<ColumnManager
					strategyType={strategyType}
					columnOrder={localOrder}
					columnVisibility={localVisibility}
					onChange={handleColumnChange}
				/>
			</section>

			<div className="sticky right-0 bottom-0 left-0 flex w-full items-center justify-between gap-3 border-t border-(--cards-border) bg-(--cards-bg) pt-3 pb-4 shadow-[0_-8px_16px_rgba(10,13,20,0.25)]/10 md:gap-4">
				<div className="text-xs text-(--text-tertiary)">
					{isModified ? 'Modified from preset defaults' : 'Matches preset defaults'}
				</div>
				<button
					type="button"
					onClick={onBack}
					className="pro-border pro-text2 hover:pro-text1 pro-hover-bg rounded-md border px-4 py-2 text-sm transition"
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleNext}
					className="pro-btn-blue flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
				>
					Next
				</button>
			</div>
		</div>
	)
}
