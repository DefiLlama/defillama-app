export const POOL_OPTIONAL_COLUMN_OPTIONS = [
	{ name: '7d Base APY', queryKey: 'show7dBaseApy', columnId: 'apyBase7d' },
	{ name: '7d IL', queryKey: 'show7dIL', columnId: 'il7d' },
	{ name: '1d Volume', queryKey: 'show1dVolume', columnId: 'volumeUsd1d' },
	{ name: '7d Volume', queryKey: 'show7dVolume', columnId: 'volumeUsd7d' },
	{ name: 'Inception APY', queryKey: 'showInceptionApy', columnId: 'apyBaseInception' },
	{ name: 'Borrow Base APY', queryKey: 'showBorrowBaseApy', columnId: 'apyBaseBorrow' },
	{ name: 'Borrow Reward APY', queryKey: 'showBorrowRewardApy', columnId: 'apyRewardBorrow' },
	{ name: 'Net Borrow APY', queryKey: 'showNetBorrowApy', columnId: 'apyBorrow' },
	{ name: 'Max LTV', queryKey: 'showLTV', columnId: 'ltv' },
	{ name: 'Supplied', queryKey: 'showTotalSupplied', columnId: 'totalSupplyUsd' },
	{ name: 'Borrowed', queryKey: 'showTotalBorrowed', columnId: 'totalBorrowUsd' },
	{ name: 'Available', queryKey: 'showAvailable', columnId: 'totalAvailableUsd' },
	{ name: '30d Median APY', queryKey: 'showMedianApy', columnId: 'apyMedian30d', isPremium: true },
	{ name: '30d Std Dev', queryKey: 'showStdDev', columnId: 'apyStd30d', isPremium: true },
	{ name: 'Holder Count', queryKey: 'showHolderCount', columnId: 'holderCount' },
	{ name: 'Top 10 %', queryKey: 'showTop10Pct', columnId: 'top10Pct' },
	{ name: 'Holders Avg Position', queryKey: 'showAvgPosition', columnId: 'avgPositionUsd' }
] as const

export type PoolOptionalColumnOption = (typeof POOL_OPTIONAL_COLUMN_OPTIONS)[number]
export type PoolColumnQueryKey = PoolOptionalColumnOption['queryKey']
export type PoolOptionalColumnId = PoolOptionalColumnOption['columnId']

const allPoolColumnQueryKeys: PoolColumnQueryKey[] = []
const poolQueryKeyToColumnId = {} as Record<PoolColumnQueryKey, PoolOptionalColumnId>
for (const option of POOL_OPTIONAL_COLUMN_OPTIONS) {
	allPoolColumnQueryKeys.push(option.queryKey)
	poolQueryKeyToColumnId[option.queryKey] = option.columnId
}

export const ALL_POOL_COLUMN_QUERY_KEYS = allPoolColumnQueryKeys
export const POOL_QUERY_KEY_TO_COLUMN_ID = poolQueryKeyToColumnId
