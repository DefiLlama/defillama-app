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

export interface TokenRiskExposureAsset {
	symbol: string
	address: string
	priceUsd: number
}

export interface TokenRiskExposure {
	asset: TokenRiskExposureAsset
	chain: string
	protocol: string
	collateralMaxBorrowUsd: number
	collateralBorrowedDebtUsd: number | null
	minBadDebtAtPriceZeroUsd: number | null
}

export interface TokenRiskExposureMethodologies {
	asset: string
	chain: string
	protocol: string
	collateralMaxBorrowUsd: string
	collateralBorrowedDebtUsd: string
	minBadDebtAtPriceZeroUsd: string
}

export interface TokenRiskLendingExposuresResponse {
	methodologies: TokenRiskExposureMethodologies
	timestamp: number
	hourlyTimestamp: number
	exposures: TokenRiskExposure[]
}
