interface TokenRiskBorrowCapacityAsset {
	symbol: string
	address: string
	priceUsd: number
}

interface TokenRiskBorrowCapacityTotals {
	collateralMaxBorrowUsdGovernance: number | null
	collateralMaxBorrowUsdLiquidity: number
	collateralBorrowedDebtUsd: number | null
	minBadDebtAtPriceZeroUsd: number | null
}

interface TokenRiskBorrowCapacityByProtocolEntry extends TokenRiskBorrowCapacityTotals {
	protocol: string
}

export interface TokenRiskBorrowCapacityTokenEntry {
	asset: TokenRiskBorrowCapacityAsset
	chain: string
	totals: TokenRiskBorrowCapacityTotals
	byProtocol: TokenRiskBorrowCapacityByProtocolEntry[]
}

export interface TokenRiskBorrowCapacityMethodologies {
	asset: string
	chain: string
	protocol: string
	collateralMaxBorrowUsdGovernance: string
	collateralMaxBorrowUsdLiquidity: string
	collateralBorrowedDebtUsd: string
	minBadDebtAtPriceZeroUsd: string
}

export interface TokenRiskBorrowCapacityResponse {
	methodologies: TokenRiskBorrowCapacityMethodologies
	timestamp: number
	hourlyTimestamp: number
	tokens: TokenRiskBorrowCapacityTokenEntry[]
}
