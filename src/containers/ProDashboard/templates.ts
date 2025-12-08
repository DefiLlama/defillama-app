import type {
	Chain,
	CHART_TYPES,
	ChartConfig,
	DashboardItemConfig,
	MetricConfig,
	MultiChartConfig,
	Protocol,
	UnifiedTableConfig
} from './types'

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
		count: 4,
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
		count: 4,
		grouping: 'day'
	},
	{
		id: 'dex-leaders',
		name: 'DEX Leaders',
		description: 'Compare top decentralized exchanges by volume',
		type: 'protocols',
		metrics: ['volume', 'fees', 'revenue', 'tvl'],
		filter: { metadataFlag: 'dexs' },
		count: 4,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'lending-protocols',
		name: 'Lending Protocols',
		description: 'Compare top lending and borrowing platforms',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue'],
		filter: { category: 'Lending' },
		count: 4,
		grouping: 'day'
	},
	{
		id: 'liquid-staking',
		name: 'Liquid Staking',
		description: 'Compare liquid staking derivatives protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue'],
		filter: { category: 'Liquid Staking' },
		count: 4,
		grouping: 'day'
	},
	{
		id: 'perps-protocols',
		name: 'Perps Protocols',
		description: 'Compare perpetual futures trading platforms',
		type: 'protocols',
		metrics: ['perps', 'openInterest', 'fees', 'revenue', 'tvl'],
		filter: { metadataFlag: 'perps' },
		count: 4,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'bridge-protocols',
		name: 'Bridges',
		description: 'Compare top cross-chain bridge protocols',
		type: 'protocols',
		metrics: ['volume', 'fees', 'revenue', 'tvl'],
		filter: { category: 'Bridge' },
		count: 4,
		displayMode: 'stacked',
		grouping: 'day'
	},
	{
		id: 'cdp-protocols',
		name: 'CDP & Stablecoins',
		description: 'Compare collateralized debt position protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue'],
		filter: { category: 'CDP' },
		count: 4,
		grouping: 'day'
	},
	{
		id: 'yield-protocols',
		name: 'Yield Aggregators',
		description: 'Compare yield optimization protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue'],
		filter: { category: 'Yield Aggregator' },
		count: 4,
		grouping: 'week'
	},
	{
		id: 'restaking-protocols',
		name: 'Restaking',
		description: 'Compare restaking and shared security protocols',
		type: 'protocols',
		metrics: ['tvl', 'fees', 'revenue'],
		filter: { category: 'Restaking' },
		count: 4,
		grouping: 'day'
	},
	{
		id: 'dex-aggregators',
		name: 'DEX Aggregators',
		description: 'Compare DEX aggregator protocols by volume',
		type: 'protocols',
		metrics: ['aggregators', 'fees', 'revenue', 'tvl'],
		filter: { metadataFlag: 'dexAggregators' },
		count: 4,
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
		count: 4,
		displayMode: 'stacked',
		grouping: 'day'
	}
]

const TEMPLATE_TABLE_COLUMNS: Record<string, { columns: string[]; sortBy: string }> = {
	'top-l1-chains': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h', 'bridgedTvl', 'stablesMcap'],
		sortBy: 'tvl'
	},
	'l2-ecosystem': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h', 'bridgedTvl', 'stablesMcap'],
		sortBy: 'tvl'
	},
	'dex-leaders': {
		columns: ['name', 'tvl', 'volume24h', 'volume_7d', 'fees24h', 'revenue24h', 'change7d'],
		sortBy: 'volume24h'
	},
	'lending-protocols': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h'],
		sortBy: 'tvl'
	},
	'liquid-staking': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h'],
		sortBy: 'tvl'
	},
	'perps-protocols': {
		columns: ['name', 'tvl', 'perpsVolume24h', 'perpsVolume7d', 'openInterest', 'fees24h', 'revenue24h'],
		sortBy: 'perpsVolume24h'
	},
	'bridge-protocols': {
		columns: ['name', 'tvl', 'volume24h', 'volume_7d', 'fees24h', 'revenue24h'],
		sortBy: 'volume24h'
	},
	'cdp-protocols': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h'],
		sortBy: 'tvl'
	},
	'yield-protocols': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h'],
		sortBy: 'tvl'
	},
	'restaking-protocols': {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h'],
		sortBy: 'tvl'
	},
	'dex-aggregators': {
		columns: ['name', 'tvl', 'aggregators_volume_24h', 'aggregators_volume_7d', 'fees24h', 'revenue24h'],
		sortBy: 'aggregators_volume_24h'
	},
	'derivatives-protocols': {
		columns: ['name', 'tvl', 'options_volume_24h', 'options_volume_7d', 'fees24h', 'revenue24h'],
		sortBy: 'options_volume_24h'
	}
}

function generateId(prefix: string, suffix: string): string {
	return `${prefix}-${suffix}-${Date.now()}`
}

interface ProtocolMetadata {
	flags?: Record<string, boolean>
}

export interface ChainCategoryData {
	chainsInCategory: Map<string, Set<string>>
}

interface SelectedItem {
	slug: string
	name: string
}

function getSelectedItems(
	template: DashboardTemplate,
	protocols: Protocol[],
	chains: Chain[],
	protocolMetadata: Map<string, ProtocolMetadata>,
	chainCategoryData?: ChainCategoryData
): SelectedItem[] {
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

		return filtered
			.filter((p) => !p.parentProtocol)
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			.slice(0, template.count)
			.map((p) => ({ slug: p.slug, name: p.name }))
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

		return filteredChains
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			.slice(0, template.count)
			.map((c) => ({ slug: c.name, name: c.name }))
	}
}

function generateTemplateMetrics(template: DashboardTemplate, selectedItems: SelectedItem[]): MetricConfig[] {
	const primaryMetric = template.metrics.find((m): m is string => !!m)
	if (!primaryMetric) return []

	return selectedItems.map((item) => ({
		id: generateId('metric', `${item.slug}-${primaryMetric}`),
		kind: 'metric' as const,
		subject: {
			itemType: template.type === 'chains' ? ('chain' as const) : ('protocol' as const),
			chain: template.type === 'chains' ? item.slug : undefined,
			protocol: template.type === 'protocols' ? item.slug : undefined
		},
		type: primaryMetric,
		aggregator: 'latest' as const,
		window: '30d' as const,
		compare: { mode: 'previous_window' as const, format: 'percent' as const },
		showSparkline: true,
		colSpan: 0.5 as const
	}))
}

function generateTemplateTable(template: DashboardTemplate, selectedItems: SelectedItem[]): UnifiedTableConfig {
	const tableConfig = TEMPLATE_TABLE_COLUMNS[template.id] || {
		columns: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h'],
		sortBy: 'tvl'
	}

	const columnVisibility: Record<string, boolean> = {}
	for (const col of tableConfig.columns) {
		columnVisibility[col] = true
	}

	const itemNames = selectedItems.map((item) => item.name)

	return {
		id: generateId('unified-table', `template-${template.id}`),
		kind: 'unified-table' as const,
		rowHeaders: template.type === 'chains' ? ['chain'] : ['protocol'],
		filters: {
			protocols: template.type === 'protocols' ? itemNames : undefined,
			chains: template.type === 'chains' ? itemNames : undefined
		},
		columnOrder: tableConfig.columns,
		columnVisibility,
		defaultSorting: [{ id: tableConfig.sortBy, desc: true }],
		colSpan: 2 as const
	}
}

function generateTemplateMultiCharts(
	template: DashboardTemplate,
	selectedItems: SelectedItem[],
	chartTypes: typeof CHART_TYPES
): MultiChartConfig[] {
	const validMetrics = template.metrics.filter((m): m is string => !!m)
	return validMetrics.map((metric) => {
		const chartTypeInfo = chartTypes[metric as keyof typeof chartTypes]
		const isGroupable = chartTypeInfo && 'groupable' in chartTypeInfo && chartTypeInfo.groupable

		const chartItems: ChartConfig[] = selectedItems.map((item) => ({
			id: generateId('chart', `${item.slug}-${metric}`),
			kind: 'chart' as const,
			chain: template.type === 'chains' ? item.slug : '',
			protocol: template.type === 'protocols' ? item.slug : undefined,
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

export function generateTemplateCharts(
	template: DashboardTemplate,
	protocols: Protocol[],
	chains: Chain[],
	protocolMetadata: Map<string, ProtocolMetadata>,
	chartTypes: typeof CHART_TYPES,
	chainCategoryData?: ChainCategoryData
): DashboardItemConfig[] {
	const selectedItems = getSelectedItems(template, protocols, chains, protocolMetadata, chainCategoryData)

	if (selectedItems.length === 0) {
		return []
	}

	const metricCards = generateTemplateMetrics(template, selectedItems)
	const multiCharts = generateTemplateMultiCharts(template, selectedItems, chartTypes)
	const table = generateTemplateTable(template, selectedItems)

	return [...metricCards, ...multiCharts, table]
}
