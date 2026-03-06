export interface ChainListItem {
	name: string
	tvl?: number
	[key: string]: unknown
}

export interface ChainsCategoriesResponse {
	categories: string[]
}

export interface ChainsByCategoryResponse {
	chainsUnique: string[]
	categories: string[]
	chainTvls: Array<{
		name: string
		extraTvl?: Record<string, { tvl?: number }>
		[key: string]: unknown
	}>
	chainsGroupbyParent: Record<string, Record<string, string[]>>
	stackedDataset: Array<[string, Record<string, Record<string, number>>]>
	tvlTypes: Record<string, string>
	[key: string]: unknown
}

export interface ChainChartResponse {
	tvl: Array<[string | number, number]>
	staking: Array<[string | number, number]>
	borrowed: Array<[string | number, number]>
	pool2: Array<[string | number, number]>
	vesting: Array<[string | number, number]>
	offers: Array<[string | number, number]>
	doublecounted: Array<[string | number, number]>
	liquidstaking: Array<[string | number, number]>
	dcAndLsOverlap: Array<[string | number, number]>
}
