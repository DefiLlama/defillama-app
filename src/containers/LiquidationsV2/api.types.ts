export interface RawLiquidationPosition {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: string
	extra?: {
		displayName?: string
		url: string
	}
}

export interface RawProtocolsResponse {
	protocols: string[]
}

export interface RawAllLiquidationsResponse {
	data: Record<string, Record<string, RawLiquidationPosition[]>>
	timestamp: number
}

export interface RawProtocolLiquidationsResponse {
	data: Record<string, RawLiquidationPosition[]>
	timestamp: number
}

export interface RawProtocolChainLiquidationsResponse {
	data: RawLiquidationPosition[]
	timestamp: number
}

export interface NavLink {
	label: string
	to: string
}

export interface LiquidationPosition {
	protocol: string
	chain: string
	owner: string
	ownerName: string
	ownerUrl: string
	liqPrice: number
	collateral: string
	collateralAmount: string
}

export interface OverviewProtocolRow {
	protocol: string
	positionCount: number
	chainCount: number
	collateralCount: number
}

export interface OverviewChainRow {
	chain: string
	positionCount: number
	protocolCount: number
	collateralCount: number
}

export interface ProtocolChainRow {
	protocol: string
	chain: string
	positionCount: number
	collateralCount: number
}

export interface LiquidationsOverviewPageProps {
	protocolLinks: NavLink[]
	timestamp: number
	protocolCount: number
	chainCount: number
	positionCount: number
	protocolRows: OverviewProtocolRow[]
	chainRows: OverviewChainRow[]
}

export interface LiquidationsProtocolPageProps {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocol: string
	timestamp: number
	chainCount: number
	positionCount: number
	collateralCount: number
	chainRows: ProtocolChainRow[]
	positions: LiquidationPosition[]
}

export interface LiquidationsChainPageProps {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocol: string
	chain: string
	timestamp: number
	positionCount: number
	collateralCount: number
	chainRows: ProtocolChainRow[]
	positions: LiquidationPosition[]
}
