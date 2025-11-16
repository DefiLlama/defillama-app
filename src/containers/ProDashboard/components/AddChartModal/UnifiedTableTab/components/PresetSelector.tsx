import { useMemo } from 'react'
import { Tooltip } from '~/components/Tooltip'
import type { TableFilters, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import type { FilterPreset } from '../presets/filterPresets'
import { CORE_FILTER_PRESETS } from '../presets/filterPresets'

interface PresetSelectorProps {
	currentFilters: TableFilters
	strategyType: UnifiedTableConfig['strategyType']
	onApplyPreset: (preset: FilterPreset) => void
}

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
	const availablePresets = useMemo(() => {
		return CORE_FILTER_PRESETS.filter((preset) => {
			if (preset.strategyType && preset.strategyType !== strategyType && preset.strategyType !== 'both') {
				return false
			}
			return true
		})
	}, [strategyType])

	if (!availablePresets.length) {
		return null
	}

	return (
		<div className="space-y-3">
			<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
				{availablePresets.map((preset) => {
					const isActive = filtersEqual(currentFilters, preset.filters)
					return (
						<Tooltip content={preset.tooltip} key={preset.id} className="w-full">
							<button
								type="button"
								onClick={() => onApplyPreset(preset)}
								className={`group relative w-full rounded-lg border p-3 text-left transition ${
									isActive
										? 'border-(--primary) bg-(--primary)/10'
										: 'border-(--cards-border) bg-(--cards-bg) hover:border-(--primary)/40 hover:bg-(--cards-bg2)'
								}`}
							>
								{isActive ? <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-(--primary)" /> : null}
								<p className="mb-1 text-sm font-semibold text-(--text-primary)">{preset.name}</p>
								<p className="text-xs text-(--text-secondary)">{preset.description}</p>
							</button>
						</Tooltip>
					)
				})}
			</div>
		</div>
	)
}
