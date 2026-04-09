import type { IChainMetadata } from '~/utils/metadata/types'

export enum ADAPTER_TYPES {
	DEXS = 'dexs',
	FEES = 'fees',
	AGGREGATORS = 'aggregators',
	PERPS = 'derivatives',
	PERPS_AGGREGATOR = 'aggregator-derivatives',
	OPTIONS = 'options',
	BRIDGE_AGGREGATORS = 'bridge-aggregators',
	OPEN_INTEREST = 'open-interest',
	NORMALIZED_VOLUME = 'normalized-volume',
	NFT_VOLUME = 'nft-volume',
	ACTIVE_USERS = 'active-users',
	NEW_USERS = 'new-users'
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
	DAILY_ACTIVE_LIQUIDITY = 'dailyActiveLiquidity',
	DAILY_ACTIVE_USERS = 'dailyActiveUsers',
	DAILY_NEW_USERS = 'dailyNewUsers',
	DAILY_TRANSACTIONS_COUNT = 'dailyTransactionsCount',
	DAILY_GAS_USED = 'dailyGasUsed'
}

export const ADAPTER_DATA_TYPE_KEYS = {
	dailyFees: 'df',
	dailyRevenue: 'dr',
	dailyHoldersRevenue: 'dhr',
	dailySupplySideRevenue: 'dssr',
	dailyBribesRevenue: 'dbr',
	dailyTokenTaxes: 'dtt',
	dailyAppRevenue: 'dar',
	dailyAppFees: 'daf',
	dailyNotionalVolume: 'dnv',
	dailyPremiumVolume: 'dpv',
	openInterestAtEnd: 'doi',
	dailyVolume: 'dv',
	dailyBridgeVolume: 'dbv',
	dailyNormalizedVolume: 'dnvol',
	dailyActiveLiquidity: 'dal',
	dailyActiveUsers: 'dau',
	dailyNewUsers: 'dnu',
	dailyTransactionsCount: 'dtc',
	dailyGasUsed: 'dgu'
} as const

type ChainMetadataKey = Extract<keyof IChainMetadata, string>

// Keyed by `${adapterType}:${dataType}` for ambiguous data types (e.g. dailyVolume),
// or plain `${dataType}` for unambiguous ones. Lookup tries composite key first.
const CHAIN_METADATA_KEYS: Record<string, ChainMetadataKey> = {
	// dailyVolume is shared across adapter types -- composite keys disambiguate
	[`${ADAPTER_TYPES.DEXS}:${ADAPTER_DATA_TYPES.DAILY_VOLUME}`]: 'dexs',
	[`${ADAPTER_TYPES.PERPS}:${ADAPTER_DATA_TYPES.DAILY_VOLUME}`]: 'perps',
	[`${ADAPTER_TYPES.AGGREGATORS}:${ADAPTER_DATA_TYPES.DAILY_VOLUME}`]: 'dexAggregators',
	[`${ADAPTER_TYPES.PERPS_AGGREGATOR}:${ADAPTER_DATA_TYPES.DAILY_VOLUME}`]: 'perpsAggregators',
	// dailyNotionalVolume is shared across adapter types -- composite keys disambiguate
	[`${ADAPTER_TYPES.DEXS}:${ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME}`]: 'dexsNotionalVolume',
	[`${ADAPTER_TYPES.OPTIONS}:${ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME}`]: 'optionsNotionalVolume',
	// unambiguous data types
	[ADAPTER_DATA_TYPES.DAILY_FEES]: 'fees',
	[ADAPTER_DATA_TYPES.DAILY_REVENUE]: 'revenue',
	[ADAPTER_DATA_TYPES.DAILY_PREMIUM_VOLUME]: 'optionsPremiumVolume',
	[ADAPTER_DATA_TYPES.OPEN_INTEREST_AT_END]: 'openInterest',
	[ADAPTER_DATA_TYPES.DAILY_BRIDGE_VOLUME]: 'bridgeAggregators',
	[ADAPTER_DATA_TYPES.DAILY_NORMALIZED_VOLUME]: 'normalizedVolume',
	[ADAPTER_DATA_TYPES.DAILY_ACTIVE_LIQUIDITY]: 'activeLiquidity',
	[ADAPTER_DATA_TYPES.DAILY_ACTIVE_USERS]: 'chainActiveUsers',
	[ADAPTER_DATA_TYPES.DAILY_NEW_USERS]: 'chainNewUsers',
	[ADAPTER_DATA_TYPES.DAILY_TRANSACTIONS_COUNT]: 'txCount',
	[ADAPTER_DATA_TYPES.DAILY_GAS_USED]: 'gasUsed',
	// fee sub-types gate on fees flag, revenue sub-types gate on revenue flag
	[ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE]: 'revenue',
	[ADAPTER_DATA_TYPES.DAILY_SUPPLY_SIDE_REVENUE]: 'revenue',
	[ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE]: 'fees',
	[ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES]: 'fees',
	[ADAPTER_DATA_TYPES.DAILY_APP_REVENUE]: 'revenue',
	[ADAPTER_DATA_TYPES.DAILY_APP_FEES]: 'fees',
	[ADAPTER_DATA_TYPES.DAILY_EARNINGS]: 'revenue'
}

export function getChainMetadataKey(
	adapterType: `${ADAPTER_TYPES}`,
	dataType: `${ADAPTER_DATA_TYPES}`
): ChainMetadataKey | undefined {
	return CHAIN_METADATA_KEYS[`${adapterType}:${dataType}`] ?? CHAIN_METADATA_KEYS[dataType]
}

// Dimensions rendered as lines instead of bars. Also checked against chartName in breakdown
// mode, where individual series are protocol names that won't match these dimension names.
export const LINE_DIMENSIONS = new Set(['Open Interest', 'Active Liquidity'])
