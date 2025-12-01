import { ChainChartLabels } from '~/containers/ChainOverview/constants'
import { ProtocolChartsLabels } from '~/containers/ProtocolOverview/Chart/constants'
import { ChartConfig, MultiChartConfig } from '../types'
import { getSupportedChainCharts, getUnsupportedChainCharts } from './chainChartMapping'
import { generateItemId } from './dashboardUtils'
import { getSupportedProtocolCharts, getUnsupportedProtocolCharts } from './protocolChartMapping'

export interface ProtocolChartSerializationParams {
	protocolId: string
	protocolName: string
	geckoId?: string | null
	toggledMetrics: ProtocolChartsLabels[]
	chartColors: Record<string, string>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}

export function serializeProtocolChartToMultiChart(params: ProtocolChartSerializationParams): {
	multiChart: MultiChartConfig | null
	unsupportedMetrics: ProtocolChartsLabels[]
} {
	const { protocolId, protocolName, geckoId, toggledMetrics, chartColors, groupBy } = params

	const supported = getSupportedProtocolCharts(toggledMetrics)
	const unsupported = getUnsupportedProtocolCharts(toggledMetrics)

	if (supported.length === 0) {
		return { multiChart: null, unsupportedMetrics: unsupported }
	}

	const grouping = groupBy === 'daily' ? 'day' : groupBy === 'weekly' ? 'week' : groupBy === 'monthly' ? 'month' : 'day'

	const charts: ChartConfig[] = supported.map(({ label, dashboardType }) => {
		return {
			id: generateItemId('chart', `${protocolId}-${dashboardType}`),
			kind: 'chart',
			protocol: protocolId,
			chain: '',
			type: dashboardType,
			grouping,
			geckoId: geckoId ?? null,
			color: chartColors[label]
		}
	})

	const multiChart: MultiChartConfig = {
		id: generateItemId('multi', protocolId),
		kind: 'multi',
		name: `${protocolName}`,
		items: charts,
		grouping,
		showCumulative: groupBy === 'cumulative'
	}

	return { multiChart, unsupportedMetrics: unsupported }
}

export interface ChainChartSerializationParams {
	chainName: string
	geckoId?: string | null
	toggledMetrics: ChainChartLabels[]
	chartColors: Record<ChainChartLabels, string>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}

export function serializeChainChartToMultiChart(params: ChainChartSerializationParams): {
	multiChart: MultiChartConfig | null
	unsupportedMetrics: ChainChartLabels[]
} {
	const { chainName, geckoId, toggledMetrics, chartColors, groupBy } = params

	if (chainName === 'All') {
		return { multiChart: null, unsupportedMetrics: toggledMetrics }
	}

	const supported = getSupportedChainCharts(toggledMetrics)
	const unsupported = getUnsupportedChainCharts(toggledMetrics)

	if (supported.length === 0) {
		return { multiChart: null, unsupportedMetrics: unsupported }
	}

	const grouping = groupBy === 'daily' ? 'day' : groupBy === 'weekly' ? 'week' : groupBy === 'monthly' ? 'month' : 'day'

	const charts: ChartConfig[] = supported.map(({ label, dashboardType }) => {
		return {
			id: generateItemId('chart', `${chainName}-${dashboardType}`),
			kind: 'chart',
			chain: chainName,
			protocol: undefined,
			type: dashboardType,
			grouping,
			geckoId: geckoId ?? null,
			color: chartColors[label]
		}
	})

	const multiChart: MultiChartConfig = {
		id: generateItemId('multi', chainName),
		kind: 'multi',
		name: `${chainName} – Overview`,
		items: charts,
		grouping,
		showCumulative: groupBy === 'cumulative'
	}

	return { multiChart, unsupportedMetrics: unsupported }
}
