import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { attributeOptionsMap } from './Attributes'

// Keys that are considered filter params
const FILTER_KEYS = ['token', 'attribute', 'minTvl', 'maxTvl', 'minApy', 'maxApy', 'chain', 'project', 'category']

// Helper to normalize value to array
const toArray = <T,>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])

// Format large numbers: 1234 → "1.2k", 14684 → "14.7k"
function formatCount(n: number): string {
	if (n >= 1000) {
		const k = n / 1000
		return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`
	}
	return String(n)
}

// Preset filter definitions
export const YIELD_PRESETS = {
	allPools: {
		label: 'All Pools',
		description: 'Show all pools without filters',
		icon: 'layout-grid' as const,
		filters: {}
	},
	blueChip: {
		label: 'Blue Chip',
		description: 'ETH, BTC & stables on audited protocols with $100M+ TVL',
		icon: 'layers' as const,
		filters: {
			token: ['ETH', 'BTC', 'ALL_USD_STABLES'],
			attribute: ['audited', 'no_memecoins'],
			minTvl: '100000000'
		}
	},
	stables: {
		label: 'Stablecoins',
		description: 'USD stablecoins with single exposure, $100k+ TVL',
		icon: 'dollar-sign' as const,
		filters: {
			token: 'ALL_USD_STABLES',
			attribute: ['single_exposure', 'no_memecoins'],
			minTvl: '100000'
		}
	},
	rwa: {
		label: 'Tokenized RWA',
		description: 'Real world assets like gold and commodities',
		icon: 'banknote' as const,
		filters: {
			token: 'TOKENIZED_COMMODITIES'
		}
	},
	noMemes: {
		label: 'No Memes',
		description: 'Exclude all meme tokens from results',
		icon: 'alert-triangle' as const,
		filters: {
			attribute: 'no_memecoins'
		}
	}
} as const

type PresetKey = keyof typeof YIELD_PRESETS

interface PresetFiltersProps {
	className?: string
	pools?: Array<any>
	totalPools?: number
}

// Check if a pool matches preset filters (for counting)
function matchesPresetFilters(pool: any, filters: Record<string, any>): boolean {
	if (filters.token) {
		const tokenFilters = toArray(filters.token)
		const tokensInPool = pool.symbol
			.split('(')[0]
			.split('-')
			.map((x: string) => x.toLowerCase().trim())

		const hasMatch = tokenFilters.some((token: string) => {
			const t = token.toLowerCase()
			if (t === 'all_usd_stables') return pool.stablecoin === true
			if (t === 'all_bitcoins') return tokensInPool.some((x: string) => x.includes('btc'))
			if (t === 'tokenized_commodities') return pool.category === 'RWA'
			return tokensInPool.some((x: string) => x.includes(t))
		})
		if (!hasMatch) return false
	}

	if (filters.attribute) {
		for (const attr of toArray(filters.attribute)) {
			const opt = attributeOptionsMap.get(attr)
			if (opt && !opt.filterFn(pool)) return false
		}
	}

	if (filters.minTvl && pool.tvlUsd < Number(filters.minTvl)) return false

	return true
}

export function PresetFilters({ className, pools = [], totalPools }: PresetFiltersProps) {
	const router = useRouter()
	const { query, pathname } = router

	const poolCounts = React.useMemo(() => {
		const counts: Record<string, number> = { allPools: totalPools ?? pools.length }
		if (pools.length > 0) {
			for (const [key, preset] of Object.entries(YIELD_PRESETS)) {
				if (key !== 'allPools') {
					counts[key] = pools.filter((pool) => matchesPresetFilters(pool, preset.filters)).length
				}
			}
		}
		return counts
	}, [pools, totalPools])

	const hasNoFilters = React.useMemo(() => {
		return !FILTER_KEYS.some((key) => query[key])
	}, [query])

	const activePresets = React.useMemo(() => {
		const active = new Set<PresetKey>()
		if (hasNoFilters) active.add('allPools')

		for (const [key, preset] of Object.entries(YIELD_PRESETS)) {
			if (key === 'allPools' || Object.keys(preset.filters).length === 0) continue

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
	}, [query, hasNoFilters])

	const handlePresetClick = React.useCallback(
		(presetKey: PresetKey) => {
			const preset = YIELD_PRESETS[presetKey]
			const isActive = activePresets.has(presetKey)
			let newQuery = { ...query }

			if (presetKey === 'allPools') {
				// Clear all filters
				for (const key of FILTER_KEYS) delete newQuery[key]
			} else if (isActive) {
				// Remove preset filters
				for (const [filterKey, filterValue] of Object.entries(preset.filters)) {
					const expected = toArray(filterValue)
					const current = query[filterKey] ? toArray(query[filterKey]) : []
					const remaining = current.filter((v) => !expected.includes(v))
					if (remaining.length === 0) delete newQuery[filterKey]
					else newQuery[filterKey] = remaining.length === 1 ? remaining[0] : remaining
				}
			} else {
				// Add preset filters
				for (const [filterKey, filterValue] of Object.entries(preset.filters)) {
					const expected = toArray(filterValue)
					const current = query[filterKey] ? toArray(query[filterKey]) : []
					const merged = [...new Set([...current, ...expected])]
					newQuery[filterKey] = merged.length === 1 ? merged[0] : merged
				}
			}

			router.push({ pathname, query: newQuery }, undefined, { shallow: true })
		},
		[activePresets, query, pathname, router]
	)

	return (
		<div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
			{(Object.keys(YIELD_PRESETS) as PresetKey[]).map((key) => {
				const preset = YIELD_PRESETS[key]
				const isActive = activePresets.has(key)
				const count = poolCounts[key]

				return (
					<Tooltip key={key} content={preset.description} placement="bottom">
						<button
							onClick={() => handlePresetClick(key)}
							className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
								isActive
									? 'bg-(--old-blue) text-white'
									: 'bg-(--btn-bg) text-(--text-primary) hover:bg-(--btn-hover-bg) border border-(--form-control-border)'
							}`}
						>
							<Icon name={preset.icon} height={14} width={14} />
							{preset.label}
							{count !== undefined && <span className="opacity-70">({formatCount(count)})</span>}
							{isActive && key !== 'allPools' && <Icon name="x" height={12} width={12} className="ml-0.5 opacity-80" />}
						</button>
					</Tooltip>
				)
			})}
		</div>
	)
}
