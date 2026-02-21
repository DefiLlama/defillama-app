export interface RawLiquidationsAvailabilityResponse {
	availability: Record<string, number>
	time: number
}

export interface RawLiquidationPosition {
	owner: string
	liqPrice: number
	collateralValue: number
	collateralAmount: number
	chain: string
	protocol: string
	collateral: string
	displayName?: string
	url: string
}

export interface RawLiquidationsDataResponse {
	symbol: string
	currentPrice: number
	positions: RawLiquidationPosition[]
	time: number
}
