export interface TokenRiskRouteAsset {
	symbol: string
	address: string
	priceUsd: number
}

export interface TokenRiskRoute {
	protocol: string
	chain: string
	market: string
	collateral: TokenRiskRouteAsset
	debt: TokenRiskRouteAsset
	collateralTotalSupplyUsd: number
	debtTotalSupplyUsd: number
	debtTotalBorrowedUsd: number
	debtUtilization?: number
	maxLtv: number
	liquidationThreshold: number
	liquidationPenalty: number
	availableToBorrowUsd: number
	borrowCapUsd?: number | null
	isolationMode?: boolean | null
	debtCeilingUsd?: number | null
	borrowApy: number
	collateralSupplyApy: number
}

export interface TokenRiskRouteMethodologies {
	protocol: string
	chain: string
	market: string
	collateral: string
	debt: string
	collateralTotalSupplyUsd: string
	debtTotalSupplyUsd: string
	debtTotalBorrowedUsd: string
	debtUtilization: string
	maxLtv: string
	liquidationThreshold: string
	liquidationPenalty: string
	availableToBorrowUsd: string
	borrowCapUsd: string
	isolationMode: string
	debtCeilingUsd: string
	borrowApy: string
	collateralSupplyApy: string
}

export interface TokenRiskBorrowRoutesResponse {
	methodologies: TokenRiskRouteMethodologies
	timestamp: number
	hourlyTimestamp: number
	routes: TokenRiskRoute[]
}

export interface TokenRiskLendingRoutesBucket {
	asDebt: TokenRiskRoute[]
	asCollateral: TokenRiskRoute[]
}

export interface TokenRiskLendingRisksResponse {
	methodologies: TokenRiskRouteMethodologies & {
		asDebt: string
		asCollateral: string
	}
	timestamp: number
	hourlyTimestamp: number
	results: Record<string, TokenRiskLendingRoutesBucket>
}

export interface TokenRiskBorrowCapacityAsset {
	symbol: string
	address: string
	priceUsd: number
}

export interface TokenRiskBorrowCapacityTotals {
	collateralMaxBorrowUsdGovernance: number | null
	collateralMaxBorrowUsdLiquidity: number
	collateralBorrowedDebtUsd: number | null
	minBadDebtAtPriceZeroUsd: number | null
}

export interface TokenRiskBorrowCapacityByProtocolEntry extends TokenRiskBorrowCapacityTotals {
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
