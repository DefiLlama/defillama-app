export interface ILiquidableProtocolRow {
	name: string
	changes24h: number
	liquidableAmount: number
	dangerousAmount: number
}

export interface ILiquidablePositionsRow {
	protocolName: string
	chainName: string
	owner?: {
		url: string
		displayName: string
	}
	value: number
	amount: number
	liqPrice: number
}
