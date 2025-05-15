export interface Chain {
	gecko_id: string
	tvl: number
	tokenSymbol: string
	name: string
	chainId?: string
}

export type DashboardItemConfig = ChartConfig | ProtocolsTableConfig

export interface ChartConfig {
	id: string
	kind: 'chart'
	chain: string
	protocol?: string
	type: string
	data?: [string, number][]
	isLoading?: boolean
	hasError?: boolean
	refetch?: () => void
	grouping?: 'day' | 'week' | 'month'
}

export interface ProtocolsTableConfig {
	id: string
	kind: 'table'
	chain: string
}

export interface Protocol {
	id: string
	name: string
	logo?: string
	slug: string
	tvl: number
}

export const CHART_TYPES = {
	tvl: { id: 'tvl', title: 'TVL', chartType: 'area', color: '#2172E5' },
	volume: { id: 'volume', title: 'Volume', chartType: 'bar', color: '#5CCA93', groupable: true },
	fees: { id: 'fees', title: 'Fees', chartType: 'bar', color: '#F2994A', groupable: true },
	users: { id: 'users', title: 'Users', chartType: 'bar', color: '#8A2BE2', groupable: true },
	txs: { id: 'txs', title: 'Transactions', chartType: 'bar', color: '#FF6347', groupable: true },
	perpsVolume: { id: 'perpsVolume', title: 'Perps Volume', chartType: 'bar', color: '#8B5CF6', groupable: true },
	optionsVolume: { id: 'optionsVolume', title: 'Options Volume', chartType: 'bar', color: '#F472B6', groupable: true },
	aggregatorsVolume: {
		id: 'aggregatorsVolume',
		title: 'Aggregators Volume',
		chartType: 'bar',
		color: '#34D399',
		groupable: true
	},
	perpsAggregatorsVolume: {
		id: 'perpsAggregatorsVolume',
		title: 'Perps Aggregators Volume',
		chartType: 'bar',
		color: '#F59E42',
		groupable: true
	},
	bridgeAggregatorsVolume: {
		id: 'bridgeAggregatorsVolume',
		title: 'Bridge Aggregators Volume',
		chartType: 'bar',
		color: '#60A5FA',
		groupable: true
	},
	revenue: { id: 'revenue', title: 'Revenue', chartType: 'bar', color: '#E59421', groupable: true }
}
