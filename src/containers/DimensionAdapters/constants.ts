export enum ADAPTER_TYPES {
	DEXS = 'dexs',
	FEES = 'fees',
	AGGREGATORS = 'aggregators',
	PERPS = 'derivatives',
	PERPS_AGGREGATOR = 'aggregator-derivatives',
	OPTIONS = 'options',
	BRIDGE_AGGREGATORS = 'bridge-aggregators'
}

export enum ADAPTER_DATA_TYPES {
	REVENUE = 'dailyRevenue',
	HOLDERS_REVENUE = 'dailyHoldersRevenue',
	BRIBES_REVENUE = 'dailyBribesRevenue',
	TOKEN_TAXES = 'dailyTokenTaxes',
	NOTIONAL_VOLUME = 'dailyNotionalVolume',
	PREMIUM_VOLUME = 'dailyPremiumVolume',
	APP_FEES = 'dailyAppFees',
	APP_REVENUE = 'dailyAppRevenue'
}

export const VOLUME_TYPE_ADAPTERS = [
	'dexs',
	'derivatives',
	'options',
	'aggregators',
	'aggregator-derivatives',
	'bridge-aggregators'
]

export const ADAPTER_TYPES_TO_METADATA_TYPE = {
	[ADAPTER_TYPES.DEXS]: 'dexs',
	[ADAPTER_TYPES.FEES]: 'fees',
	[ADAPTER_TYPES.AGGREGATORS]: 'dexAggregators',
	[ADAPTER_TYPES.PERPS]: 'perps',
	[ADAPTER_TYPES.PERPS_AGGREGATOR]: 'perpsAggregators',
	[ADAPTER_TYPES.OPTIONS]: 'options',
	[ADAPTER_TYPES.BRIDGE_AGGREGATORS]: 'bridgeAggregators'
}
