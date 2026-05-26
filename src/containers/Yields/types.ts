import type { YieldTokenCategory } from './api.types'

export type YieldView =
	| 'main'
	| 'stablecoins'
	| 'overview'
	| 'borrow'
	| 'borrowAdvanced'
	| 'loop'
	| 'strategy'
	| 'strategyLongShort'
	| 'watchlist'
	| 'projects'
	| 'unknown'

export interface YieldTokenOption {
	name: string
	symbol: string
	logo: string | null
	fallbackLogo: string | null
}

export interface StablecoinInfo {
	price: number | null
	pegDeviation: number | null
}

export type StablecoinInfoBySymbol = Record<string, StablecoinInfo>
export type YieldTokenCategories = Record<string, YieldTokenCategory>

export interface YieldPool {
	/** Pool config id from the Yields API. Table rows use `configID` for this id and `pool` for the display symbol. */
	pool: string
	symbol: string
	project: string
	projectName: string
	chain: string
	category: string | null
	tvlUsd: number
	apy: number
	apyBase: number | null
	apyReward: number | null
	rewardTokens: string[]
	rewardTokensSymbols?: Array<string | null>
	rewardTokensNames?: string[]
	rewardMeta?: string | null
	underlyingTokens: string[]
	airdrop: boolean
	raiseValuation: number | null
	audits: string | null
	url: string
	stablecoin?: boolean
	exposure?: string
	ilRisk?: string
	hasMemeToken?: boolean
	outlier?: boolean
	predictions?: {
		predictedClass?: string
		binnedConfidence?: number
	}
	apyPct1D?: number | null
	apyPct7D?: number | null
	il7d?: number | null
	apyBase7d?: number | null
	apyNet7d?: number | null
	apyMean30d?: number | null
	volumeUsd1d?: number | null
	volumeUsd7d?: number | null
	apyBaseInception?: number | null
	apyLsd?: number | null
	apyIncludingLsdApy?: number | null
	apyBaseIncludingLsdApy?: number | null
	apyBaseBorrow?: number | null
	apyRewardBorrow?: number | null
	apyBorrow?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	totalAvailableUsd?: number | null
	ltv?: number | null
	borrowable?: boolean
	mintedCoin?: string | null
	borrowFactor?: number
	debtCeilingUsd?: number | null
	loopApy?: number | null
	boost?: number | null
	lsdTokenOnly?: boolean
	poolMeta?: string | null
}

export interface YieldPageProps {
	pools: YieldPool[]
	chainList: string[]
	projectList: string[]
	categoryList: string[]
	tokenNameMapping: Record<string, string>
	tokens: YieldTokenOption[]
	tokenSymbolsList: string[]
	usdPeggedSymbols: string[]
	stablecoinInfoBySymbol: StablecoinInfoBySymbol
	tokenCategories: YieldTokenCategories
	evmChains: string[]
}

export interface YieldPageData {
	props: YieldPageProps
}

export interface LendBorrowPool extends YieldPool {
	apyBaseBorrow?: number | null
	apyRewardBorrow?: number | null
	apyBorrow?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	totalAvailableUsd?: number | null
	ltv?: number | null
	borrowable?: boolean
	mintedCoin?: string | null
	borrowFactor?: number
	loopApy?: number | null
	boost?: number | null
}

export interface LendBorrowData {
	props: {
		pools: LendBorrowPool[]
		chainList: string[]
		projectList: string[]
		lendingProtocols: string[]
		farmProtocols: string[]
		categoryList: string[]
		tokenNameMapping: Record<string, string>
		allPools: YieldPool[]
		symbols: string[]
		evmChains: string[]
	}
}
