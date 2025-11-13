import type { VisibilityState } from '@tanstack/react-table'
import { DEFAULT_CHAINS_COLUMN_ORDER } from '../constants'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from './ColumnDictionary'

export interface UnifiedTablePreset {
	id: string
	name: string
	description?: string
	strategyType: 'protocols' | 'chains'
	columnOrder: string[]
	columnVisibility: VisibilityState
	rowHeaders: string[]
	defaultSorting?: Array<{ id: string; desc?: boolean }>
}

const ALL_COLUMN_IDS = ['name', ...UNIFIED_TABLE_COLUMN_DICTIONARY.map((column) => column.id)]

const createVisibility = (columns: string[]): VisibilityState => {
	const visible = new Set(columns)
	visible.add('name')
	return ALL_COLUMN_IDS.reduce<VisibilityState>((acc, id) => {
		acc[id] = visible.has(id)
		return acc
	}, {})
}

export const UNIFIED_TABLE_PRESETS: UnifiedTablePreset[] = [
	{
		id: 'essential-protocols',
		name: 'Essential Protocols',
		description: 'Core protocol overview with TVL, fees, revenue, volume and ratios.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'tvl',
			'change1d',
			'change7d',
			'fees24h',
			'fees_7d',
			'revenue24h',
			'revenue_7d',
			'volume24h',
			'volume_7d',
			'mcap',
			'mcaptvl'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'tvl',
			'change1d',
			'change7d',
			'fees24h',
			'fees_7d',
			'revenue24h',
			'revenue_7d',
			'volume24h',
			'volume_7d',
			'mcap',
			'mcaptvl'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'tvl', desc: true }]
	},
	{
		id: 'fees-protocols',
		name: 'Fees',
		description: 'Daily/weekly/monthly fees with holder & treasury splits.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'fees24h',
			'fees_7d',
			'fees_30d',
			'fees_1y',
			'average_1y',
			'cumulativeFees',
			'userFees_24h',
			'holderRevenue_24h',
			'holdersRevenue30d',
			'treasuryRevenue_24h',
			'supplySideRevenue_24h',
			'feesChange_1d',
			'feesChange_7d',
			'feesChange_1m'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'fees24h',
			'fees_7d',
			'fees_30d',
			'fees_1y',
			'average_1y',
			'cumulativeFees',
			'userFees_24h',
			'holderRevenue_24h',
			'holdersRevenue30d',
			'treasuryRevenue_24h',
			'supplySideRevenue_24h',
			'feesChange_1d',
			'feesChange_7d',
			'feesChange_1m'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'fees24h', desc: true }]
	},
	{
		id: 'volume-protocols',
		name: 'DEXs',
		description: 'Volume with changes and market share metrics.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'volume24h',
			'volume_7d',
			'volume_30d',
			'cumulativeVolume',
			'volumeChange_1d',
			'volumeChange_7d',
			'volumeChange_1m',
			'volumeDominance_24h',
			'volumeMarketShare7d'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'volume24h',
			'volume_7d',
			'volume_30d',
			'cumulativeVolume',
			'volumeChange_1d',
			'volumeChange_7d',
			'volumeChange_1m',
			'volumeDominance_24h',
			'volumeMarketShare7d'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'volume24h', desc: true }]
	},
	{
		id: 'perps-protocols',
		name: 'Perpetuals',
		description: 'Perpetual volume, changes and open interest.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'perpsVolume24h',
			'perps_volume_7d',
			'perps_volume_30d',
			'perps_volume_change_1d',
			'perps_volume_change_7d',
			'perps_volume_change_1m',
			'perps_volume_dominance_24h',
			'openInterest'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'perpsVolume24h',
			'perps_volume_7d',
			'perps_volume_30d',
			'perps_volume_change_1d',
			'perps_volume_change_7d',
			'perps_volume_change_1m',
			'perps_volume_dominance_24h',
			'openInterest'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'perpsVolume24h', desc: true }]
	},
	{
		id: 'revenue-protocols',
		name: 'Revenue',
		description: 'Revenue performance with longer-term trends and efficiency ratios.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'revenue24h',
			'revenue_7d',
			'revenue_30d',
			'revenue_1y',
			'average_revenue_1y',
			'revenueChange_1d',
			'revenueChange_7d',
			'revenueChange_1m',
			'fees24h',
			'fees_7d',
			'mcap',
			'mcaptvl'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'revenue24h',
			'revenue_7d',
			'revenue_30d',
			'revenue_1y',
			'average_revenue_1y',
			'revenueChange_1d',
			'revenueChange_7d',
			'revenueChange_1m',
			'fees24h',
			'fees_7d',
			'mcap',
			'mcaptvl'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'revenue24h', desc: true }]
	},
	{
		id: 'growth-protocols',
		name: 'Growth',
		description: 'TVL, volume and fee momentum to spot what is trending.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'tvl',
			'change1d',
			'change7d',
			'change1m',
			'volume24h',
			'volumeChange_1d',
			'volumeChange_7d',
			'volumeChange_1m',
			'fees24h',
			'feesChange_1d',
			'feesChange_7d',
			'revenue24h',
			'revenueChange_1d',
			'revenueChange_7d',
			'mcaptvl'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'tvl',
			'change1d',
			'change7d',
			'change1m',
			'volume24h',
			'volumeChange_1d',
			'volumeChange_7d',
			'volumeChange_1m',
			'fees24h',
			'feesChange_1d',
			'feesChange_7d',
			'revenue24h',
			'revenueChange_1d',
			'revenueChange_7d',
			'mcaptvl'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'change7d', desc: true }]
	},
	{
		id: 'aggregators-protocols',
		name: 'DEX Aggregators',
		description: 'Aggregator volumes, share and momentum.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'aggregators_volume_24h',
			'aggregators_volume_7d',
			'aggregators_volume_30d',
			'aggregators_volume_change_1d',
			'aggregators_volume_change_7d',
			'aggregators_volume_dominance_24h',
			'aggregators_volume_marketShare7d',
			'volume24h',
			'volume_7d'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'aggregators_volume_24h',
			'aggregators_volume_7d',
			'aggregators_volume_30d',
			'aggregators_volume_change_1d',
			'aggregators_volume_change_7d',
			'aggregators_volume_dominance_24h',
			'aggregators_volume_marketShare7d',
			'volume24h',
			'volume_7d'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'aggregators_volume_24h', desc: true }]
	},
	{
		id: 'bridge-aggregators-protocols',
		name: 'Bridge Aggregators',
		description: 'Bridge flow volumes and market share.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'bridge_aggregators_volume_24h',
			'bridge_aggregators_volume_7d',
			'bridge_aggregators_volume_30d',
			'bridge_aggregators_volume_change_1d',
			'bridge_aggregators_volume_change_7d',
			'bridge_aggregators_volume_dominance_24h',
			'volume24h',
			'volume_7d'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'bridge_aggregators_volume_24h',
			'bridge_aggregators_volume_7d',
			'bridge_aggregators_volume_30d',
			'bridge_aggregators_volume_change_1d',
			'bridge_aggregators_volume_change_7d',
			'bridge_aggregators_volume_dominance_24h',
			'volume24h',
			'volume_7d'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'bridge_aggregators_volume_24h', desc: true }]
	},
	{
		id: 'options-protocols',
		name: 'Options',
		description: 'Options volume with growth and market share.',
		strategyType: 'protocols',
		columnOrder: [
			'name',
			'category',
			'chains',
			'options_volume_24h',
			'options_volume_7d',
			'options_volume_30d',
			'options_volume_change_1d',
			'options_volume_change_7d',
			'options_volume_dominance_24h',
			'volume24h',
			'volume_7d'
		],
		columnVisibility: createVisibility([
			'name',
			'category',
			'chains',
			'options_volume_24h',
			'options_volume_7d',
			'options_volume_30d',
			'options_volume_change_1d',
			'options_volume_change_7d',
			'options_volume_dominance_24h',
			'volume24h',
			'volume_7d'
		]),
		rowHeaders: ['parent-protocol', 'protocol'],
		defaultSorting: [{ id: 'options_volume_24h', desc: true }]
	},
	{
		id: 'chains-essential',
		name: 'Essential Chains',
		description: 'Chain TVL, fees, revenue and volume overview.',
		strategyType: 'chains',
		columnOrder: [...DEFAULT_CHAINS_COLUMN_ORDER],
		columnVisibility: createVisibility([...DEFAULT_CHAINS_COLUMN_ORDER]),
		rowHeaders: ['chain'],
		defaultSorting: [{ id: 'tvl', desc: true }]
	},
	{
		id: 'chains-fees',
		name: 'Chain Fees & Revenue',
		description: 'Track fee and revenue contribution by chain.',
		strategyType: 'chains',
		columnOrder: [
			'name',
			'protocolCount',
			'users',
			'tvl',
			'change1d',
			'change7d',
			'fees24h',
			'fees_7d',
			'fees_30d',
			'revenue24h',
			'revenue_7d',
			'volume24h',
			'volume_7d',
			'nftVolume',
			'mcaptvl'
		],
		columnVisibility: createVisibility([
			'name',
			'protocolCount',
			'users',
			'tvl',
			'change1d',
			'change7d',
			'fees24h',
			'fees_7d',
			'fees_30d',
			'revenue24h',
			'revenue_7d',
			'volume24h',
			'volume_7d',
			'nftVolume',
			'mcaptvl'
		]),
		rowHeaders: ['chain'],
		defaultSorting: [{ id: 'fees24h', desc: true }]
	},
	{
		id: 'chains-growth',
		name: 'Chain Growth',
		description: 'Momentum view across TVL, volume and fees.',
		strategyType: 'chains',
		columnOrder: [
			'name',
			'protocolCount',
			'users',
			'tvl',
			'change1d',
			'change7d',
			'change1m',
			'volume24h',
			'fees24h',
			'revenue24h',
			'nftVolume',
			'mcaptvl'
		],
		columnVisibility: createVisibility([
			'name',
			'protocolCount',
			'users',
			'tvl',
			'change1d',
			'change7d',
			'change1m',
			'volume24h',
			'fees24h',
			'revenue24h',
			'nftVolume',
			'mcaptvl'
		]),
		rowHeaders: ['chain'],
		defaultSorting: [{ id: 'change7d', desc: true }]
	},
	{
		id: 'chains-market-share',
		name: 'Chain Market Share',
		description: 'Compare chains by TVL, stables and 24h volume share.',
		strategyType: 'chains',
		columnOrder: ['name', 'tvl', 'tvlShare', 'stablesMcap', 'stablesShare', 'volume24h', 'volume24hShare'],
		columnVisibility: createVisibility(['name', 'tvl', 'tvlShare', 'stablesMcap', 'stablesShare', 'volume24h', 'volume24hShare']),
		rowHeaders: ['chain'],
		defaultSorting: [{ id: 'tvlShare', desc: true }]
	}
]

export const UNIFIED_TABLE_PRESETS_BY_ID = new Map(UNIFIED_TABLE_PRESETS.map((preset) => [preset.id, preset]))
