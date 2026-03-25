export type RWAOverviewMode = 'chain' | 'category' | 'platform'
export type RWATimeSeriesChartBreakdown = 'category' | 'assetClass' | 'assetName' | 'platform'
export type RWATimeSeriesChartState =
	| { mode: 'chain'; breakdown: 'category' | 'assetClass' | 'platform' }
	| { mode: 'category'; breakdown: 'assetClass' | 'platform' }
	| { mode: 'platform'; breakdown: 'assetName' | 'category' | 'assetClass' }

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
export const RWA_YIELD_WRAPPER_SLUG = 'rwa-yield-wrapper'

const CHAIN_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'category', name: 'Asset Category' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'platform', name: 'Asset Platform' }
] as const

const CATEGORY_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'platform', name: 'Asset Platform' }
] as const

const PLATFORM_TIME_SERIES_BREAKDOWN_OPTIONS = [
	{ key: 'assetName', name: 'Asset Name' },
	{ key: 'category', name: 'Asset Category' },
	{ key: 'assetClass', name: 'Asset Class' }
] as const

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

export function isTypeIncludedByDefault(
	type: string | null | undefined,
	mode: RWAOverviewMode,
	categorySlug?: string | null
): boolean {
	if (mode === 'platform') return true
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
			return 'category'
		case 'category':
			return 'assetClass'
		case 'platform':
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
		default:
			return assertNever(mode)
	}
}

export function getRWATimeSeriesChartState(mode: RWAOverviewMode, breakdown: string | null): RWATimeSeriesChartState {
	switch (mode) {
		case 'chain':
			return {
				mode,
				breakdown: breakdown === 'assetClass' || breakdown === 'platform' ? breakdown : 'category'
			}
		case 'category':
			return {
				mode,
				breakdown: breakdown === 'platform' ? breakdown : 'assetClass'
			}
		case 'platform':
			return {
				mode,
				breakdown: breakdown === 'category' || breakdown === 'assetClass' ? breakdown : 'assetName'
			}
		default:
			return assertNever(mode)
	}
}
