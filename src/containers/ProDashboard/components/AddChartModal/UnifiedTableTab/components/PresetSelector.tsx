import { useMemo, useState } from 'react'
import type { TableFilters, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import type { FilterPreset } from '../presets/filterPresets'
import { CORE_FILTER_PRESETS } from '../presets/filterPresets'

interface PresetSelectorProps {
	currentFilters: TableFilters
	strategyType: UnifiedTableConfig['strategyType']
	onApplyPreset: (preset: FilterPreset) => void
}

const PRESET_CATEGORIES = [
	{ id: 'all', label: 'All presets', icon: '🎯' },
	{ id: 'size', label: 'By size', icon: '📊' },
	{ id: 'revenue', label: 'Revenue & activity', icon: '💰' },
	{ id: 'investment', label: 'Investment theses', icon: '🚀' },
	{ id: 'category', label: 'By category', icon: '🏗️' },
	{ id: 'quick', label: 'Quick filters', icon: '⚡' }
]

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

export function PresetSelector({ currentFilters, strategyType, onApplyPreset }: PresetSelectorProps) {
	const [selectedCategory, setSelectedCategory] = useState<string>('all')

	const availablePresets = useMemo(() => {
		return CORE_FILTER_PRESETS.filter((preset) => {
			if (preset.strategyType && preset.strategyType !== strategyType && preset.strategyType !== 'both') {
				return false
			}
			if (selectedCategory !== 'all' && preset.category !== selectedCategory) {
				return false
			}
			return true
		})
	}, [selectedCategory, strategyType])

	if (!availablePresets.length) {
		return null
	}

	return (
		<div className="space-y-3">
			<div className="flex gap-1 overflow-x-auto">
				{PRESET_CATEGORIES.map((category) => (
					<button
						key={category.id}
						type="button"
						onClick={() => setSelectedCategory(category.id)}
						className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
							selectedCategory === category.id
								? 'bg-(--primary) text-white'
								: 'bg-(--cards-bg2) text-(--text-secondary) hover:bg-(--cards-border)'
						}`}
					>
						<span className="mr-1">{category.icon}</span>
						{category.label}
					</button>
				))}
			</div>
			<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
				{availablePresets.map((preset) => {
					const isActive = filtersEqual(currentFilters, preset.filters)
					return (
						<button
							type="button"
							key={preset.id}
							onClick={() => onApplyPreset(preset)}
							className={`group relative rounded-lg border p-3 text-left transition ${
								isActive
									? 'border-(--primary) bg-(--primary)/10'
									: 'border-(--cards-border) bg-(--cards-bg) hover:border-(--primary)/40 hover:bg-(--cards-bg2)'
							}`}
							title={preset.tooltip}
						>
							{isActive ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-(--primary)" /> : null}
							<div className="mb-1 flex items-center gap-2">
								{preset.icon ? <span className="text-lg">{preset.icon}</span> : null}
								<p className="text-sm font-semibold text-(--text-primary)">{preset.name}</p>
							</div>
							<p className="text-xs text-(--text-secondary)">{preset.description}</p>
							{preset.tags && preset.tags.length ? (
								<div className="mt-2 flex flex-wrap gap-1">
									{preset.tags.map((tag) => (
										<span key={tag} className="rounded bg-(--cards-border) px-1.5 py-0.5 text-[10px] text-(--text-tertiary)">
											{tag}
										</span>
									))}
								</div>
							) : null}
						</button>
					)
				})}
			</div>
		</div>
	)
}
