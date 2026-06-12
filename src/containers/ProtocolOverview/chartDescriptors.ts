import type { fetchAdapterProtocolChartData, fetchAdapterProtocolMetrics } from '~/containers/AdapterMetrics/api'
import type { ProtocolChartsLabels } from './constants'
import type { IProtocolPageMetrics } from './types'

type AdapterChartRequest = Omit<Parameters<typeof fetchAdapterProtocolChartData>[0], 'protocol'>
type AdapterMetricsRequest = Omit<Parameters<typeof fetchAdapterProtocolMetrics>[0], 'protocol'>
type AdapterChartMetricKey = keyof Pick<
	IProtocolPageMetrics,
	| 'fees'
	| 'revenue'
	| 'dexs'
	| 'dexsNotionalVolume'
	| 'perps'
	| 'openInterest'
	| 'optionsPremiumVolume'
	| 'optionsNotionalVolume'
	| 'dexAggregators'
	| 'perpsAggregators'
	| 'bridgeAggregators'
>
export type AdapterChartRenderKind = 'feeFamily' | 'bar' | 'line'

interface IAdapterChartDescriptor {
	label: ProtocolChartsLabels
	chartRequest: AdapterChartRequest
	metricsRequest: AdapterMetricsRequest
	methodologyKey: string
	clientQueryKey: string
	metricKeys: ReadonlyArray<AdapterChartMetricKey>
	renderKind: AdapterChartRenderKind
}

export const ADAPTER_CHART_DESCRIPTORS = [
	{
		label: 'Fees',
		chartRequest: { adapterType: 'fees' },
		metricsRequest: { adapterType: 'fees' },
		methodologyKey: 'Fees',
		clientQueryKey: 'fees',
		metricKeys: ['fees'],
		renderKind: 'feeFamily'
	},
	{
		label: 'Revenue',
		chartRequest: { adapterType: 'fees', dataType: 'dailyRevenue' },
		metricsRequest: { adapterType: 'fees', dataType: 'dailyRevenue' },
		methodologyKey: 'Revenue',
		clientQueryKey: 'revenue',
		metricKeys: ['revenue'],
		renderKind: 'feeFamily'
	},
	{
		label: 'Holders Revenue',
		chartRequest: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		metricsRequest: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		methodologyKey: 'HoldersRevenue',
		clientQueryKey: 'holders-revenue',
		metricKeys: ['fees', 'revenue'],
		renderKind: 'feeFamily'
	},
	{
		label: 'DEX Volume',
		chartRequest: { adapterType: 'dexs' },
		metricsRequest: { adapterType: 'dexs' },
		methodologyKey: 'dexs',
		clientQueryKey: 'dex-volume',
		metricKeys: ['dexs'],
		renderKind: 'bar'
	},
	{
		label: 'DEX Notional Volume',
		chartRequest: { adapterType: 'dexs', dataType: 'dailyNotionalVolume' },
		metricsRequest: { adapterType: 'dexs', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'dexsNotionalVolume',
		clientQueryKey: 'dex-notional-volume',
		metricKeys: ['dexsNotionalVolume'],
		renderKind: 'bar'
	},
	{
		label: 'Perp Volume',
		chartRequest: { adapterType: 'derivatives' },
		metricsRequest: { adapterType: 'derivatives' },
		methodologyKey: 'perps',
		clientQueryKey: 'perp-volume',
		metricKeys: ['perps'],
		renderKind: 'bar'
	},
	{
		label: 'Open Interest',
		chartRequest: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		metricsRequest: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		methodologyKey: 'openInterest',
		clientQueryKey: 'open-interest',
		metricKeys: ['openInterest'],
		renderKind: 'line'
	},
	{
		label: 'Options Premium Volume',
		chartRequest: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		metricsRequest: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		methodologyKey: 'optionsPremiumVolume',
		clientQueryKey: 'options-premium-volume',
		metricKeys: ['optionsPremiumVolume'],
		renderKind: 'bar'
	},
	{
		label: 'Options Notional Volume',
		chartRequest: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		metricsRequest: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'optionsNotionalVolume',
		clientQueryKey: 'options-notional-volume',
		metricKeys: ['optionsNotionalVolume'],
		renderKind: 'bar'
	},
	{
		label: 'DEX Aggregator Volume',
		chartRequest: { adapterType: 'aggregators' },
		metricsRequest: { adapterType: 'aggregators' },
		methodologyKey: 'dexAggregators',
		clientQueryKey: 'dex-aggregator-volume',
		metricKeys: ['dexAggregators'],
		renderKind: 'bar'
	},
	{
		label: 'Perp Aggregator Volume',
		chartRequest: { adapterType: 'aggregator-derivatives' },
		metricsRequest: { adapterType: 'aggregator-derivatives' },
		methodologyKey: 'perpsAggregators',
		clientQueryKey: 'perp-aggregator-volume',
		metricKeys: ['perpsAggregators'],
		renderKind: 'bar'
	},
	{
		label: 'Bridge Aggregator Volume',
		chartRequest: { adapterType: 'bridge-aggregators' },
		metricsRequest: { adapterType: 'bridge-aggregators' },
		methodologyKey: 'bridgeAggregators',
		clientQueryKey: 'bridge-aggregator-volume',
		metricKeys: ['bridgeAggregators'],
		renderKind: 'bar'
	}
] as const satisfies ReadonlyArray<IAdapterChartDescriptor>

export type AdapterChartDescriptorLabel = (typeof ADAPTER_CHART_DESCRIPTORS)[number]['label']
