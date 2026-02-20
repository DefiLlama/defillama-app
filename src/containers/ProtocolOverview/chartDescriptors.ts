import type { fetchAdapterProtocolChartData, fetchAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api'
import type { ProtocolChartsLabels } from './constants'

type AdapterChartRequest = Omit<Parameters<typeof fetchAdapterProtocolChartData>[0], 'protocol'>
type AdapterMetricsRequest = Omit<Parameters<typeof fetchAdapterProtocolMetrics>[0], 'protocol'>

export interface IAdapterChartDescriptor {
	label: ProtocolChartsLabels
	chartRequest: AdapterChartRequest
	metricsRequest: AdapterMetricsRequest
	methodologyKey: string
}

export const ADAPTER_CHART_DESCRIPTORS = [
	{
		label: 'Fees',
		chartRequest: { adapterType: 'fees' },
		metricsRequest: { adapterType: 'fees' },
		methodologyKey: 'Fees'
	},
	{
		label: 'Revenue',
		chartRequest: { adapterType: 'fees', dataType: 'dailyRevenue' },
		metricsRequest: { adapterType: 'fees', dataType: 'dailyRevenue' },
		methodologyKey: 'Revenue'
	},
	{
		label: 'Holders Revenue',
		chartRequest: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		metricsRequest: { adapterType: 'fees', dataType: 'dailyHoldersRevenue' },
		methodologyKey: 'HoldersRevenue'
	},
	{
		label: 'DEX Volume',
		chartRequest: { adapterType: 'dexs' },
		metricsRequest: { adapterType: 'dexs' },
		methodologyKey: 'dexs'
	},
	{
		label: 'Perp Volume',
		chartRequest: { adapterType: 'derivatives' },
		metricsRequest: { adapterType: 'derivatives' },
		methodologyKey: 'perps'
	},
	{
		label: 'Open Interest',
		chartRequest: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		metricsRequest: { adapterType: 'open-interest', dataType: 'openInterestAtEnd' },
		methodologyKey: 'openInterest'
	},
	{
		label: 'Options Premium Volume',
		chartRequest: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		metricsRequest: { adapterType: 'options', dataType: 'dailyPremiumVolume' },
		methodologyKey: 'optionsPremiumVolume'
	},
	{
		label: 'Options Notional Volume',
		chartRequest: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		metricsRequest: { adapterType: 'options', dataType: 'dailyNotionalVolume' },
		methodologyKey: 'optionsNotionalVolume'
	},
	{
		label: 'DEX Aggregator Volume',
		chartRequest: { adapterType: 'aggregators' },
		metricsRequest: { adapterType: 'aggregators' },
		methodologyKey: 'dexAggregators'
	},
	{
		label: 'Perp Aggregator Volume',
		chartRequest: { adapterType: 'aggregator-derivatives' },
		metricsRequest: { adapterType: 'aggregator-derivatives' },
		methodologyKey: 'perpsAggregators'
	},
	{
		label: 'Bridge Aggregator Volume',
		chartRequest: { adapterType: 'bridge-aggregators' },
		metricsRequest: { adapterType: 'bridge-aggregators' },
		methodologyKey: 'bridgeAggregators'
	}
] as const satisfies ReadonlyArray<IAdapterChartDescriptor>

export const ADAPTER_CHART_DESCRIPTORS_BY_LABEL: Partial<Record<ProtocolChartsLabels, IAdapterChartDescriptor>> =
	Object.fromEntries(ADAPTER_CHART_DESCRIPTORS.map((descriptor) => [descriptor.label, descriptor])) as Partial<
		Record<ProtocolChartsLabels, IAdapterChartDescriptor>
	>
