export interface IYieldTableRow {
	rewardMeta: string
	id: string
	pool: string
	projectslug: string
	project: string
	airdrop?: boolean
	chains: Array<string>
	tvl: number
	apy: number
	apyBase: number
	apyReward: number
	rewardTokensSymbols: Array<string>
	rewards: Array<string>
	change1d: number
	change7d: number
	outlook: string
	confidence: number | null
	url: string
	category: string
	strikeTvl?: boolean
	configID: string
	apyRewardBorrow?: number
	symbol: string
	totalSupplyUsd: number
	totalBorrowUsd: number
	loopApy: number
	boost: number
	apyBorrow: number
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
	skipVirtualization?: boolean
}

export interface IYieldsOptimizerTableRow extends IYieldTableRow {
	borrow: IYieldsOptimizerTableRow
	projectName: string
	rewardTokensNames: string[]
	totalAvailableUsd: number
	lendUSDAmount: number
	borrowUSDAmount: number
	lendAmount: number
	borrowAmount: number
}

export interface IYieldsStrategyTableRow extends IYieldsOptimizerTableRow {
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
