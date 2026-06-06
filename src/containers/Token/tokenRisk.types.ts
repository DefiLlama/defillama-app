import type { TokenRiskBorrowCapacityMethodologies } from './api.types'

export type TokenRiskCoverageStatus = 'known' | 'partial' | 'unavailable'

export interface TokenRiskCandidate {
	key: string
	chain: string
	address: string
	displayName: string
}

export interface TokenRiskExposureSummary {
	totalCurrentMaxBorrowUsd: number
	totalMinBadDebtAtPriceZeroUsd: number | null
	exposureCount: number
	protocolCount: number
	chainCount: number
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
	currentMaxBorrowUsd: number
	minBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
}

export interface TokenRiskChainExposureSummary {
	chain: string
	chainDisplayName: string
	totalCurrentMaxBorrowUsd: number
	totalMinBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
}

export interface TokenRiskProtocolSummary {
	protocol: string
	protocolDisplayName: string
	totalCurrentMaxBorrowUsd: number
	totalMinBadDebtAtPriceZeroUsd: number | null
	minBadDebtAtPriceZeroCoverage: TokenRiskCoverageStatus
	chainBreakdowns: TokenRiskChainExposureSummary[]
}

export interface TokenRiskExposuresSection {
	summary: TokenRiskExposureSummary
	rows: TokenRiskExposureRow[]
	protocolSummaries: TokenRiskProtocolSummary[]
	methodologies: Pick<TokenRiskBorrowCapacityMethodologies, 'asset' | 'minBadDebtAtPriceZeroUsd'> & {
		currentMaxBorrowUsd: string
	}
}

export interface TokenRiskResponse {
	candidates: TokenRiskCandidate[]
	scopeCandidates: TokenRiskCandidate[]
	selectedCandidateKey: string | null
	exposures: TokenRiskExposuresSection
	limitations: string[]
}
