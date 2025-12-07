import type { Chain, ChartConfig, MultiChartConfig, Protocol, CHART_TYPES } from './types'

export interface DashboardTemplate {
	id: string
	name: string
	description: string
	type: 'chains' | 'protocols'
	metrics: string[]
	filter: {
		category?: string
		metadataFlag?: string
		chainNames?: string[]
		chainCategory?: string
		excludeChainCategory?: string
	}
	count: number
	displayMode?: 'default' | 'stacked'
	grouping?: 'day' | 'week' | 'month'
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
	{
		id: 'top-l1-chains',
		name: 'Top L1 Chains',
		description: 'Compare top Layer 1 blockchains by TVL',
		type: 'chains',
		metrics: ['tvl', 'volume', 'fees', 'revenue', 'stablecoins', 'bridgedTvl'],
		filter: {
			excludeChainCategory: 'Rollup'
		},
		count: 5,
		grouping: 'day'
	},
	{
		id: 'l2-ecosystem',
		name: 'L2 Ecosystem',
		description: 'Compare Layer 2 rollups and scaling solutions',
		type: 'chains',
		metrics: ['tvl', 'volume', 'fees', 'revenue', 'stablecoins', 'bridgedTvl'],
		filter: {
			chainCategory: 'Rollup'
		},
		count: 5,
		grouping: 'day'
	},
	{
		id: 'dex-leaders',
		name: 'DEX Leaders',
		description: 'Compare top decentralized exchanges by volume',
		type: 'protocols',
		metrics: ['volume', 'fees', 'revenue', 'tvl', 'incentives', 'treasury'],
		filter: { metadataFlag: 'dexs' },
		count: 5,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'lending-protocols',
		name: 'Lending Protocols',
		description: 'Compare top lending and borrowing platforms',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue', 'volume', 'incentives', 'treasury'],
		filter: { category: 'Lending' },
		count: 5,
		grouping: 'day'
	},
	{
		id: 'liquid-staking',
		name: 'Liquid Staking',
		description: 'Compare liquid staking derivatives protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue', 'volume', 'incentives', 'treasury'],
		filter: { category: 'Liquid Staking' },
		count: 5,
		grouping: 'day'
	},
	{
		id: 'perps-protocols',
		name: 'Perps Protocols',
		description: 'Compare perpetual futures trading platforms',
		type: 'protocols',
		metrics: ['perps', 'openInterest', 'fees', 'revenue', 'tvl', 'incentives'],
		filter: { metadataFlag: 'perps' },
		count: 5,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'bridge-protocols',
		name: 'Bridges',
		description: 'Compare top cross-chain bridge protocols',
		type: 'protocols',
		metrics: ['volume', 'fees', 'revenue', 'tvl', 'incentives', 'treasury'],
		filter: { category: 'Bridge' },
		count: 5,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'cdp-protocols',
		name: 'CDP & Stablecoins',
		description: 'Compare collateralized debt position protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue', 'volume', 'incentives', 'treasury'],
		filter: { category: 'CDP' },
		count: 5,
		grouping: 'day'
	},
	{
		id: 'yield-protocols',
		name: 'Yield Aggregators',
		description: 'Compare yield optimization protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue', 'volume', 'incentives'],
		filter: { category: 'Yield Aggregator' },
		count: 5,
		grouping: 'day'
	},
	{
		id: 'restaking-protocols',
		name: 'Restaking',
		description: 'Compare restaking and shared security protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue', 'volume', 'incentives'],
		filter: { category: 'Restaking' },
		count: 5,
		grouping: 'day'
	},
	{
		id: 'dex-aggregators',
		name: 'DEX Aggregators',
		description: 'Compare DEX aggregator protocols by volume',
		type: 'protocols',
		metrics: ['aggregators', 'fees', 'revenue', 'tvl', 'incentives'],
		filter: { metadataFlag: 'dexAggregators' },
		count: 5,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'derivatives-protocols',
		name: 'Derivatives',
		description: 'Compare options and derivatives protocols',
		type: 'protocols',
		metrics: ['optionsPremium', 'optionsNotional', 'fees', 'revenue', 'tvl'],
		filter: { category: 'Derivatives' },
		count: 5,
		displayMode: 'stacked',
		grouping: 'day'
	}
]

function generateId(prefix: string, suffix: string): string {
	return `${prefix}-${suffix}-${Date.now()}`
}

interface ProtocolMetadata {
	flags?: Record<string, boolean>
}

export interface ChainCategoryData {
	chainsInCategory: Map<string, Set<string>>
}

export function generateTemplateCharts(
	template: DashboardTemplate,
	protocols: Protocol[],
	chains: Chain[],
	protocolMetadata: Map<string, ProtocolMetadata>,
	chartTypes: typeof CHART_TYPES,
	chainCategoryData?: ChainCategoryData
): MultiChartConfig[] {
	let selectedItems: string[] = []

	if (template.type === 'protocols') {
		let filtered = protocols

		if (template.filter.category) {
			filtered = filtered.filter((p) => p.category === template.filter.category)
		}

		if (template.filter.metadataFlag) {
			filtered = filtered.filter((p) => {
				const meta = protocolMetadata.get(p.slug)
				return meta?.flags?.[template.filter.metadataFlag!]
			})
		}

		selectedItems = filtered
			.filter((p) => !p.parentProtocol)
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			.slice(0, template.count)
			.map((p) => p.slug)
	} else {
		let filteredChains = chains

		if (template.filter.chainCategory && chainCategoryData) {
			const categoryChains = chainCategoryData.chainsInCategory.get(template.filter.chainCategory)
			if (categoryChains) {
				filteredChains = chains.filter((c) => categoryChains.has(c.name))
			}
		}

		if (template.filter.excludeChainCategory && chainCategoryData) {
			const excludeChains = chainCategoryData.chainsInCategory.get(template.filter.excludeChainCategory)
			if (excludeChains) {
				filteredChains = filteredChains.filter((c) => !excludeChains.has(c.name))
			}
		}

		if (template.filter.chainNames) {
			const chainSet = new Set(template.filter.chainNames)
			filteredChains = filteredChains.filter((c) => chainSet.has(c.name))
		}

		selectedItems = filteredChains
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			.slice(0, template.count)
			.map((c) => c.name)
	}

	return template.metrics.map((metric) => {
		const chartTypeInfo = chartTypes[metric as keyof typeof chartTypes]
		const isGroupable = chartTypeInfo && 'groupable' in chartTypeInfo && chartTypeInfo.groupable

		const chartItems: ChartConfig[] = selectedItems.map((item) => ({
			id: generateId('chart', `${item}-${metric}`),
			kind: 'chart' as const,
			chain: template.type === 'chains' ? item : '',
			protocol: template.type === 'protocols' ? item : undefined,
			type: metric,
			grouping: isGroupable ? template.grouping : undefined
		}))

		return {
			id: generateId('multi', `template-${metric}`),
			kind: 'multi' as const,
			name: `${chartTypeInfo?.title || metric} Comparison`,
			items: chartItems,
			grouping: isGroupable ? template.grouping : undefined,
			showStacked: template.displayMode === 'stacked',
			showCumulative: false,
			showPercentage: false,
			colSpan: 1 as const
		}
	})
}
