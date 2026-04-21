import type { SortingState } from '@tanstack/react-table'

export interface IYieldTableRow {
	rewardMeta?: string
	id?: string
	pool: string
	projectslug: string
	project: string
	airdrop?: boolean
	raiseValuation?: number | null
	chains: Array<string>
	tvl: number | null
	apy: number | null
	apyBase: number | null
	apyReward: number | null
	rewardTokensSymbols: Array<string>
	rewards: Array<string>
	change1d: number | null
	change7d: number | null
	outlook?: string | null
	confidence: number | null
	url: string
	category: string | null
	strikeTvl?: boolean
	configID: string
	symbol?: string
	il7d?: number | null
	apyBase7d?: number | null
	apyNet7d?: number | null
	volumeUsd1d?: number | null
	volumeUsd7d?: number | null
	apyBaseInception?: number | null
	apyIncludingLsdApy?: number | null
	apyBaseIncludingLsdApy?: number | null
	apyBaseBorrow?: number | null
	apyRewardBorrow?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	totalAvailableUsd?: number | null
	loopApy?: number | null
	netSupplyApy?: number | null
	boost?: number | null
	apyBorrow?: number | null
	ltv?: number | null
	lsdTokenOnly?: boolean
	poolMeta?: string | null
	apyMedian30d?: number | null
	apyStd30d?: number | null
	cv30d?: number | null
	pegDeviation?: number | null
	pegPrice?: number | null
	holderCount?: number | null
	avgPositionUsd?: number | null
	top10Pct?: number | null
	holderChange7d?: number | null
	holderChange30d?: number | null
	apyMean30d?: number | null
	apyChart30d?: string | null
}

export interface IYieldsProjectsTableRow {
	audits: boolean
	category: string
	medianApy: number
	name: string
	protocols: number
	slug: string
	tvl: number
	airdrop?: boolean
}

export interface IYieldsTableProps {
	data: Array<IYieldTableRow>
	enablePagination?: boolean
	initialPageSize?: number
	sortingState?: SortingState
}

export interface IYieldsOptimizerTableRow extends IYieldTableRow {
	borrow: IYieldsOptimizerTableRow
	projectName: string
	rewardTokensNames: string[]
	borrowAvailableUsd?: number | null
	borrowBase?: number | null
	totalBase?: number | null
	lendingBase?: number | null
	totalReward?: number | null
	lendingReward?: number | null
	borrowReward?: number | null
	totalAvailableUsd: number
	lendUSDAmount: number
	borrowUSDAmount: number
	lendAmount: number
	borrowAmount: number
}

export interface IYieldsStrategyTableRow extends IYieldsOptimizerTableRow {
	strategy?: string
	totalApy?: number | null
	delta?: number | null
	strategyAPY?: number | null
	fr8hCurrent?: number | string | null
	fundingRate7dAverage?: number | string | null
	farmPool: string
	farmSymbol: string
	farmTvlUsd: number
	farmProjectName: string
	farmChain: Array<string>
	farmApy: number
	symbolPerp: string
	openInterest: number
	tvlUsd: number
	marketplace: string
	afr: number
	afr7d: number
	afr30d: number
	indexPrice: number
}
