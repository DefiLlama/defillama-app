import { useMemo } from 'react'
import { Tooltip } from '~/components/Tooltip'
import type { TableFilters } from '~/containers/ProDashboard/types'
import type { FilterPreset, FilterPresetCategory } from '../presets/filterPresets'
import { CORE_FILTER_PRESETS } from '../presets/filterPresets'

interface PresetSelectorProps {
	currentFilters: TableFilters
	onApplyPreset: (preset: FilterPreset) => void
}

const CATEGORY_CONFIG: Record<FilterPresetCategory, { label: string; color: string }> = {
	quick: { label: 'Quick', color: 'bg-gray-500/20 text-gray-400' },
	size: { label: 'Size', color: 'bg-blue-500/20 text-blue-400' },
	growth: { label: 'Growth', color: 'bg-green-500/20 text-green-400' },
	activity: { label: 'Activity', color: 'bg-purple-500/20 text-purple-400' },
	revenue: { label: 'Revenue', color: 'bg-emerald-500/20 text-emerald-400' },
	investment: { label: 'Investment', color: 'bg-amber-500/20 text-amber-400' },
	category: { label: 'Category', color: 'bg-cyan-500/20 text-cyan-400' }
}

const CATEGORY_ORDER: FilterPresetCategory[] = ['quick', 'growth', 'activity', 'size', 'revenue', 'investment', 'category']

const normalizeEntries = (filters: Partial<TableFilters>) => {
	return Object.entries(filters).filter(([_, value]) => {
		if (value === undefined || value === null) return false
		if (Array.isArray(value)) return value.length > 0
		return true
	})
}

const filtersEqual = (current: TableFilters, presetFilters: Partial<TableFilters>) => {
	const presetEntries = normalizeEntries(presetFilters)
	const currentEntries = normalizeEntries(current)
	if (presetEntries.length !== currentEntries.length) return false
	return presetEntries.every(([key, value]) => {
		const currentValue = current[key]
		return JSON.stringify(currentValue) === JSON.stringify(value)
	})
}

export function PresetSelector({ currentFilters, onApplyPreset }: PresetSelectorProps) {
	const groupedPresets = useMemo(() => {
		const filtered = CORE_FILTER_PRESETS.filter((preset) => {
			if (preset.strategyType && preset.strategyType !== 'protocols' && preset.strategyType !== 'both') {
				return false
			}
			return true
		})

		const grouped = new Map<FilterPresetCategory, FilterPreset[]>()
		for (const preset of filtered) {
			const existing = grouped.get(preset.category) || []
			existing.push(preset)
			grouped.set(preset.category, existing)
		}
		return grouped
	}, [])

	if (!groupedPresets.size) {
		return null
	}

	return (
		<div className="space-y-3">
			{CATEGORY_ORDER.map((category) => {
				const presets = groupedPresets.get(category)
				if (!presets?.length) return null
				const config = CATEGORY_CONFIG[category]

				return (
					<div key={category}>
						<div className="mb-1.5 flex items-center gap-2">
							<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${config.color}`}>
								{config.label}
							</span>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{presets.map((preset) => {
								const isActive = filtersEqual(currentFilters, preset.filters)
								return (
									<Tooltip content={preset.tooltip} key={preset.id}>
										<button
											type="button"
											onClick={() => onApplyPreset(preset)}
											className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
												isActive
													? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
													: 'border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--text-primary)'
											}`}
										>
											{preset.name}
										</button>
									</Tooltip>
								)
							})}
						</div>
					</div>
				)
			})}
		</div>
	)
}
