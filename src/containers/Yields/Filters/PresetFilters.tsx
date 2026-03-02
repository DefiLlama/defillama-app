import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const toArray = <T,>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

const YIELD_PRESETS = {
	stables: {
		label: 'Stables',
		description: 'USD, EURC stablecoins with single exposure, $1M+ TVL',
		icon: 'dollar-sign' as const,
		filters: {
			token: ['ALL_USD_STABLES', 'EURC'],
			attribute: ['single_exposure', 'no_memecoins'],
			minTvl: '1000000'
		}
	},
	majors: {
		label: 'Majors',
		description: 'BTC, ETH, SOL & stables on audited protocols with $10M+ TVL',
		icon: 'layers' as const,
		filters: {
			token: ['BTC', 'ETH', 'SOL', 'ALL_USD_STABLES', 'EURC'],
			attribute: ['audited', 'no_memecoins'],
			minTvl: '10000000'
		}
	},
	commodities: {
		label: 'Commodities',
		description: 'Tokenized gold & commodities with $100k+ TVL',
		icon: 'banknote' as const,
		filters: {
			token: 'TOKENIZED_COMMODITIES',
			minTvl: '100000'
		}
	},
	liquidStaking: {
		label: 'Liquid Staking',
		description: 'LST tokens (stETH, wstETH, etc.) on audited protocols with $1M+ TVL',
		icon: 'activity' as const,
		filters: {
			token: ['STETH', 'WSTETH', 'WEETH', 'WBETH', 'CBETH'],
			attribute: ['audited'],
			minTvl: '1000000'
		}
	},
	safeHaven: {
		label: 'Safe Haven',
		description: 'Audited, single exposure, no IL, $10M+ TVL',
		icon: 'check-circle' as const,
		filters: {
			attribute: ['audited', 'single_exposure', 'no_il', 'no_memecoins'],
			minTvl: '10000000'
		}
	},
	highYield: {
		label: 'High Yield',
		description: '10%+ APY on audited protocols with $1M+ TVL',
		icon: 'trending-up' as const,
		filters: {
			attribute: ['audited', 'no_memecoins'],
			minTvl: '1000000',
			minApy: '10'
		}
	}
} as const

type PresetKey = keyof typeof YIELD_PRESETS

const PRESET_KEYS = Object.keys(YIELD_PRESETS) as PresetKey[]

const ALL_PRESET_FILTER_KEYS = new Set(Object.values(YIELD_PRESETS).flatMap((p) => Object.keys(p.filters)))

interface PresetFiltersProps {
	className?: string
}

export function PresetFilters({ className }: PresetFiltersProps) {
	const router = useRouter()
	const { query, pathname } = router

	const activePresets = React.useMemo(() => {
		const active = new Set<PresetKey>()

		for (const [key, preset] of Object.entries(YIELD_PRESETS)) {
			const isActive = Object.entries(preset.filters).every(([filterKey, filterValue]) => {
				const queryValue = query[filterKey]
				if (!queryValue) return false
				const expected = toArray(filterValue)
				const actual = toArray(queryValue)
				return expected.every((v) => actual.includes(v))
			})

			if (isActive) active.add(key as PresetKey)
		}
		return active
	}, [query])

	const handlePresetClick = React.useCallback(
		(presetKey: PresetKey) => {
			const preset = YIELD_PRESETS[presetKey]
			const isActive = activePresets.has(presetKey)

			const newQuery: Record<string, string | string[]> = {}
			for (const [key, value] of Object.entries(query)) {
				if (!ALL_PRESET_FILTER_KEYS.has(key)) {
					newQuery[key] = value as string | string[]
				}
			}

			if (!isActive) {
				trackYieldsEvent(YIELDS_EVENTS.FILTER_PRESET, { preset: presetKey })
				for (const [filterKey, filterValue] of Object.entries(preset.filters)) {
					const values = toArray(filterValue)
					newQuery[filterKey] = values.length === 1 ? values[0] : values
				}
			}
			// If clicking active preset, just clear (already done above)

			router.push({ pathname, query: newQuery }, undefined, { shallow: true })
		},
		[activePresets, query, pathname, router]
	)

	return (
		<div className={`flex flex-col gap-2 ${className ?? ''}`}>
			<h2 className="text-xs text-(--text-secondary)">Curated Presets</h2>
			<div className="flex flex-wrap items-center gap-2">
				{PRESET_KEYS.map((key) => {
					const preset = YIELD_PRESETS[key]
					const isActive = activePresets.has(key)

					return (
						<Tooltip
							key={key}
							content={preset.description}
							placement="bottom"
							render={<button />}
							onClick={() => handlePresetClick(key)}
							className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium ${
								isActive
									? 'bg-(--old-blue) text-white'
									: 'border border-(--form-control-border) bg-(--btn-bg) text-(--text-primary) hover:bg-(--btn-hover-bg)'
							}`}
						>
							<Icon name={preset.icon} height={14} width={14} />
							{preset.label}
						</Tooltip>
					)
				})}
			</div>
		</div>
	)
}
