import type { TableFilters } from '~/containers/ProDashboard/types'

export type FilterPresetCategory = 'size' | 'revenue' | 'investment' | 'category' | 'quick'

export interface FilterPreset {
	id: string
	name: string
	description: string
	icon?: string
	category: FilterPresetCategory
	filters: Partial<TableFilters>
	tags?: string[]
	tooltip?: string
	sortBy?: {
		field: string
		direction: 'asc' | 'desc'
	}
	strategyType?: 'protocols' | 'chains' | 'both'
}

const SIZE_PRESETS: FilterPreset[] = [
	{
		id: 'size-blue-chip',
		name: 'Blue Chip',
		description: 'Large, established multi-chain protocols',
		icon: '💎',
		category: 'size',
		filters: {
			tvlMin: 1_000_000_000,
			multiChainOnly: true,
			parentProtocolsOnly: true
		},
		tags: ['safe', 'established'],
		strategyType: 'protocols'
	},
	{
		id: 'size-large-cap',
		name: 'Large Cap',
		description: 'Protocols between $100M and $1B TVL',
		icon: '🏆',
		category: 'size',
		filters: {
			tvlMin: 100_000_000,
			tvlMax: 1_000_000_000
		},
		tags: ['mature'],
		strategyType: 'protocols'
	},
	{
		id: 'size-mid-cap',
		name: 'Mid Cap',
		description: 'Growing protocols in the $10M–$100M range',
		icon: '📈',
		category: 'size',
		filters: {
			tvlMin: 10_000_000,
			tvlMax: 100_000_000
		},
		tags: ['growth'],
		strategyType: 'protocols'
	}
]

const REVENUE_PRESETS: FilterPreset[] = [
	{
		id: 'revenue-leaders',
		name: 'Revenue Leaders',
		description: 'Protocols earning over $100k per day',
		icon: '💵',
		category: 'revenue',
		filters: {
			revenue24hMin: 100_000
		},
		tags: ['profitable', 'active'],
		strategyType: 'protocols'
	}
]

const INVESTMENT_PRESETS: FilterPreset[] = [
	{
		id: 'value-plays',
		name: 'Value Protocols',
		description: 'P/F below 20 with meaningful revenue',
		icon: '💠',
		category: 'investment',
		filters: {
			pfRatioMin: 0,
			pfRatioMax: 20,
			revenue24hMin: 1_000,
			tvlMin: 10_000_000
		},
		tags: ['value', 'undervalued'],
		strategyType: 'protocols'
	},
	{
		id: 'institutional-grade',
		name: 'Institutional Grade',
		description: 'Large multi-chain protocols trusted by institutions',
		icon: '🏛️',
		category: 'investment',
		filters: {
			tvlMin: 500_000_000,
			multiChainOnly: true,
			parentProtocolsOnly: true
		},
		tags: ['safe', 'established'],
		strategyType: 'protocols'
	}
]

const CATEGORY_PRESETS: FilterPreset[] = [
	{
		id: 'dex-leaders',
		name: 'DEX Leaders',
		description: 'Top decentralized exchanges by activity',
		icon: '🔄',
		category: 'category',
		filters: {
			categories: ['Dexes'],
			volumeDex24hMin: 10_000_000,
			tvlMin: 50_000_000
		},
		tags: ['dex', 'trading'],
		strategyType: 'protocols'
	},
	{
		id: 'perps-platforms',
		name: 'Perps Platforms',
		description: 'Perpetual futures venues with real usage',
		icon: '📉',
		category: 'category',
		filters: {
			hasPerps: true,
			volumeDex24hMin: 5_000_000
		},
		tags: ['derivatives'],
		strategyType: 'protocols'
	}
]

const QUICK_PRESETS: FilterPreset[] = [
	{
		id: 'top-10-tvl',
		name: 'Top 10 by TVL',
		description: 'Largest parent protocols by current TVL',
		icon: '🔝',
		category: 'quick',
		filters: {
			parentProtocolsOnly: true
		},
		sortBy: {
			field: 'tvl',
			direction: 'desc'
		},
		tags: ['ranking'],
		strategyType: 'protocols'
	},
	{
		id: 'multi-chain-only',
		name: 'Multi-Chain Only',
		description: 'Protocols deployed on more than one chain',
		icon: '🌐',
		category: 'quick',
		filters: {
			multiChainOnly: true
		},
		tags: ['coverage'],
		strategyType: 'protocols'
	}
]

export const CORE_FILTER_PRESETS: FilterPreset[] = [
	...SIZE_PRESETS,
	...REVENUE_PRESETS,
	...INVESTMENT_PRESETS,
	...CATEGORY_PRESETS,
	...QUICK_PRESETS
]
