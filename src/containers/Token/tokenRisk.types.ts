import type { TokenRiskExposureMethodologies } from './api.types'

export type TokenRiskCoverageStatus = 'known' | 'partial' | 'unavailable'

export interface TokenRiskCandidate {
	key: string
	chain: string
	address: string
	displayName: string
}

export interface TokenRiskExposureSummary {
	totalCollateralMaxBorrowUsd: number
	totalCollateralBorrowedDebtUsd: number | null
	totalMinBadDebtAtPriceZeroUsd: number | null
	exposureCount: number
	protocolCount: number
	chainCount: number
	borrowedDebtKnownCount: number
	borrowedDebtUnknownCount: number
	minBadDebtKnownCount: number
	minBadDebtUnknownCount: number
}

export interface TokenRiskExposureRow {
	protocol: string
	protocolDisplayName: string
	chain: string
	chainDisplayName: string
	assetSymbol: string
	assetAddress: string
	collateralMaxBorrowUsd: number
	collateralBorrowedDebtUsd: number | null
	minBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
}

export interface TokenRiskExposuresSection {
	summary: TokenRiskExposureSummary
	rows: TokenRiskExposureRow[]
	methodologies: Pick<
		TokenRiskExposureMethodologies,
		'asset' | 'collateralMaxBorrowUsd' | 'collateralBorrowedDebtUsd' | 'minBadDebtAtPriceZeroUsd'
	>
}

export interface TokenRiskResponse {
	candidates: TokenRiskCandidate[]
	scopeCandidates: TokenRiskCandidate[]
	selectedCandidateKey: string | null
	exposures: TokenRiskExposuresSection
	limitations: string[]
}
