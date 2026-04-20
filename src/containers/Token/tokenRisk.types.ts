import type {
	TokenRiskLendingRisksResponse,
	TokenRiskLendingRoutesBucket,
	TokenRiskRouteMethodologies
} from './api.types'

export interface TokenRiskCandidate {
	key: string
	chain: string
	address: string
	displayName: string
}

export interface TokenRiskBorrowCapsSummary {
	totalBorrowCapUsd: number
	totalBorrowedUsd: number
	remainingCapUsd: number
	capUtilization: number | null
	protocolCount: number
	chainCount: number
	marketCount: number
}

export interface TokenRiskBorrowCapsRow {
	protocol: string
	protocolDisplayName: string
	chain: string
	chainDisplayName: string
	market: string
	debtSymbol: string
	borrowCapUsd: number | null
	debtTotalBorrowedUsd: number
	debtTotalSupplyUsd: number
	remainingCapUsd: number | null
	availableToBorrowUsd: number
	debtUtilization: number | null
	eligibleCollateralCount: number
	eligibleCollateralSymbols: string[]
}

export interface TokenRiskBorrowCapsSection {
	summary: TokenRiskBorrowCapsSummary
	rows: TokenRiskBorrowCapsRow[]
	methodologies: Pick<
		TokenRiskRouteMethodologies,
		'borrowCapUsd' | 'debtTotalBorrowedUsd' | 'debtUtilization' | 'availableToBorrowUsd'
	>
}

export interface TokenRiskCollateralRiskSummary {
	totalBorrowCapUsd: number
	totalBorrowedUsd: number
	totalAvailableToBorrowUsd: number
	routeCount: number
	isolatedRouteCount: number
	minLiquidationBuffer: number | null
	maxLiquidationBuffer: number | null
}

export interface TokenRiskCollateralRiskRow {
	protocol: string
	protocolDisplayName: string
	chain: string
	chainDisplayName: string
	market: string
	debtSymbol: string
	debtTotalSupplyUsd: number
	debtTotalBorrowedUsd: number
	borrowCapUsd: number
	maxLtv: number
	liquidationThreshold: number
	liquidationPenalty: number
	liquidationBuffer: number
	borrowApy: number
	isolationMode: boolean
	debtCeilingUsd: number | null
	availableToBorrowUsd: number
}

export interface TokenRiskCollateralRiskSection {
	summary: TokenRiskCollateralRiskSummary
	rows: TokenRiskCollateralRiskRow[]
	methodologies: Pick<
		TokenRiskRouteMethodologies,
		| 'availableToBorrowUsd'
		| 'debtTotalBorrowedUsd'
		| 'maxLtv'
		| 'liquidationThreshold'
		| 'liquidationPenalty'
		| 'isolationMode'
		| 'debtCeilingUsd'
	>
}

export interface TokenRiskSelectedChainRisk {
	candidateKey: string
	timestamp: number | null
	hourlyTimestamp: number | null
	methodologies: TokenRiskLendingRisksResponse['methodologies'] | null
	bucket: TokenRiskLendingRoutesBucket | null
}

export interface TokenRiskResponse {
	candidates: TokenRiskCandidate[]
	scopeCandidates: TokenRiskCandidate[]
	selectedCandidateKey: string | null
	borrowCaps: TokenRiskBorrowCapsSection
	collateralRisk: TokenRiskCollateralRiskSection
	selectedChainRisk: TokenRiskSelectedChainRisk | null
	limitations: string[]
}
