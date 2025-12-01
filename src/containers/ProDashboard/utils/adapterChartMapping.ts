import { ChartBuilderConfig } from '../types'

export const ADAPTER_TO_DASHBOARD_TYPE: Record<string, string | null> = {
	dexs: 'volume',
	fees: 'fees',
	derivatives: 'perps',
	aggregators: 'aggregators',
	'aggregator-derivatives': 'perpsAggregators',
	options: 'optionsPremium',
	'bridge-aggregators': 'bridgeAggregators',
	'open-interest': 'openInterest'
}

export const ADAPTER_TO_BUILDER_METRIC: Record<string, ChartBuilderConfig['config']['metric'] | null> = {
	dexs: 'volume',
	fees: 'fees',
	derivatives: 'perps',
	aggregators: 'dex-aggregators',
	'aggregator-derivatives': 'perps-aggregators',
	options: 'options-premium',
	'bridge-aggregators': 'bridge-aggregators',
	'open-interest': 'open-interest'
}

export function getAdapterDashboardType(adapterType: string): string | null {
	return ADAPTER_TO_DASHBOARD_TYPE[adapterType] ?? null
}

export function getAdapterBuilderMetric(adapterType: string): ChartBuilderConfig['config']['metric'] | null {
	return ADAPTER_TO_BUILDER_METRIC[adapterType] ?? null
}
