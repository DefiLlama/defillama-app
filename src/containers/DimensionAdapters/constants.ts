export enum ADAPTER_TYPES {
	DEXS = 'dexs',
	FEES = 'fees',
	AGGREGATORS = 'aggregators',
	PERPS = 'derivatives',
	PERPS_AGGREGATOR = 'aggregator-derivatives',
	OPTIONS = 'options',
	BRIDGE_AGGREGATORS = 'bridge-aggregators',
	OPEN_INTEREST = 'open-interest',
	NORMALIZED_VOLUME = 'normalized-volume'
}

export enum ADAPTER_DATA_TYPES {
	DAILY_FEES = 'dailyFees',
	DAILY_REVENUE = 'dailyRevenue',
	DAILY_HOLDERS_REVENUE = 'dailyHoldersRevenue',
	DAILY_SUPPLY_SIDE_REVENUE = 'dailySupplySideRevenue',
	DAILY_BRIBES_REVENUE = 'dailyBribesRevenue',
	DAILY_TOKEN_TAXES = 'dailyTokenTaxes',
	DAILY_NOTIONAL_VOLUME = 'dailyNotionalVolume',
	DAILY_PREMIUM_VOLUME = 'dailyPremiumVolume',
	DAILY_APP_FEES = 'dailyAppFees',
	DAILY_APP_REVENUE = 'dailyAppRevenue',
	DAILY_EARNINGS = 'dailyEarnings',
	OPEN_INTEREST_AT_END = 'openInterestAtEnd',
	DAILY_VOLUME = 'dailyVolume',
	DAILY_BRIDGE_VOLUME = 'dailyBridgeVolume',
	DAILY_NORMALIZED_VOLUME = 'dailyNormalizedVolume',
	DAILY_ACTIVE_LIQUIDITY = 'dailyActiveLiquidity'
}

export type AdapterDataType = `${ADAPTER_DATA_TYPES}`

export const ADAPTER_DATA_TYPE_KEYS = {
	'dailyFees': 'df',
	'dailyRevenue': 'dr',
	'dailyHoldersRevenue': 'dhr',
	'dailySupplySideRevenue': 'dssr',
	'dailyBribesRevenue': 'dbr',
	'dailyTokenTaxes': 'dtt',
	'dailyAppRevenue': 'dar',
	'dailyAppFees': 'daf',
	'dailyNotionalVolume': 'dnv',
	'dailyPremiumVolume': 'dpv',
	'openInterestAtEnd': 'doi',
	'dailyVolume': 'dv',
	'dailyBridgeVolume': 'dbv',
	'dailyNormalizedVolume': 'dnvol',
	'dailyActiveLiquidity': 'dal'
} as const

export type AdapterDataTypeKey = keyof typeof ADAPTER_DATA_TYPE_KEYS

// Type guard to check if a string is a valid AdapterDataTypeKey
export function isAdapterDataTypeKey(key: string): key is AdapterDataTypeKey {
	return key in ADAPTER_DATA_TYPE_KEYS
}

export const VOLUME_TYPE_ADAPTERS = [
	'dexs',
	'derivatives',
	'options',
	'aggregators',
	'aggregator-derivatives',
	'bridge-aggregators',
	'normalized-volume'
]

export const ADAPTER_TYPES_TO_METADATA_TYPE = {
	[ADAPTER_TYPES.DEXS]: 'dexs',
	[ADAPTER_TYPES.FEES]: 'fees',
	[ADAPTER_TYPES.AGGREGATORS]: 'dexAggregators',
	[ADAPTER_TYPES.PERPS]: 'perps',
	[ADAPTER_TYPES.PERPS_AGGREGATOR]: 'perpsAggregators',
	[ADAPTER_TYPES.OPTIONS]: 'options',
	[ADAPTER_TYPES.BRIDGE_AGGREGATORS]: 'bridgeAggregators',
	[ADAPTER_TYPES.OPEN_INTEREST]: 'openInterest',
	[ADAPTER_TYPES.NORMALIZED_VOLUME]: 'normalizedVolume'
} as const
