export type RWAOverviewMode = 'chain' | 'category' | 'platform' | 'assetGroup'
export type RWATimeSeriesChartBreakdown = 'category' | 'assetClass' | 'assetName' | 'platform' | 'assetGroup'
export type RWATimeSeriesChartState =
	| { mode: 'chain'; breakdown: 'assetGroup' | 'category' | 'assetClass' | 'platform' }
	| { mode: 'category'; breakdown: 'assetGroup' | 'assetClass' | 'platform' }
	| { mode: 'platform'; breakdown: 'assetGroup' | 'assetName' | 'category' | 'assetClass' }
	| { mode: 'assetGroup'; breakdown: 'assetName' | 'assetClass' | 'platform' | 'category' }

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
export const RWA_YIELD_WRAPPER_SLUG = 'rwa-yield-wrapper'

const CHAIN_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetGroup', name: 'Asset Group' },
	{ key: 'category', name: 'Asset Category' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'platform', name: 'Asset Platform' }
] as const

const CATEGORY_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetGroup', name: 'Asset Group' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'platform', name: 'Asset Platform' }
] as const

const PLATFORM_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetGroup', name: 'Asset Group' },
	{ key: 'assetName', name: 'Asset Name' },
	{ key: 'category', name: 'Asset Category' },
	{ key: 'assetClass', name: 'Asset Class' }
] as const

const ASSET_GROUP_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetName', name: 'Asset Name' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'platform', name: 'Asset Platform' },
	{ key: 'category', name: 'Asset Category' }
] as const

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

export function isTypeIncludedByDefault(
	type: string | null | undefined,
	mode: RWAOverviewMode,
	categorySlug?: string | null
): boolean {
	if (mode === 'platform' || mode === 'assetGroup') return true
	if (mode === 'category' && categorySlug === RWA_YIELD_WRAPPER_SLUG) return true
	return !DEFAULT_EXCLUDED_TYPES.has(type || 'Unknown')
}

export function getDefaultSelectedTypes(
	allTypes: string[],
	mode: RWAOverviewMode,
	categorySlug?: string | null
): string[] {
	return allTypes.filter((type) => isTypeIncludedByDefault(type, mode, categorySlug))
}

export function getDefaultRWATimeSeriesChartBreakdown(mode: RWAOverviewMode): RWATimeSeriesChartBreakdown {
	switch (mode) {
		case 'chain':
			return 'assetGroup'
		case 'category':
			return 'assetGroup'
		case 'platform':
			return 'assetGroup'
		case 'assetGroup':
			return 'assetName'
		default:
			return assertNever(mode)
	}
}

export function getRWATimeSeriesChartBreakdownOptions(mode: RWAOverviewMode) {
	switch (mode) {
		case 'chain':
			return CHAIN_TIME_SERIES_BREAKDOWN_OPTIONS
		case 'category':
			return CATEGORY_TIME_SERIES_BREAKDOWN_OPTIONS
		case 'platform':
			return PLATFORM_TIME_SERIES_BREAKDOWN_OPTIONS
		case 'assetGroup':
			return ASSET_GROUP_TIME_SERIES_BREAKDOWN_OPTIONS
		default:
			return assertNever(mode)
	}
}

export function getRWATimeSeriesChartState(mode: RWAOverviewMode, breakdown: string | null): RWATimeSeriesChartState {
	switch (mode) {
		case 'chain':
			return {
				mode,
				breakdown:
					breakdown === 'assetGroup' ||
					breakdown === 'category' ||
					breakdown === 'assetClass' ||
					breakdown === 'platform'
						? breakdown
						: 'assetGroup'
			}
		case 'category':
			return {
				mode,
				breakdown:
					breakdown === 'assetGroup' || breakdown === 'assetClass' || breakdown === 'platform'
						? breakdown
						: 'assetGroup'
			}
		case 'platform':
			return {
				mode,
				breakdown:
					breakdown === 'assetGroup' ||
					breakdown === 'assetName' ||
					breakdown === 'category' ||
					breakdown === 'assetClass'
						? breakdown
						: 'assetGroup'
			}
		case 'assetGroup':
			return {
				mode,
				breakdown:
					breakdown === 'assetClass' || breakdown === 'platform' || breakdown === 'category' ? breakdown : 'assetName'
			}
		default:
			return assertNever(mode)
	}
}
