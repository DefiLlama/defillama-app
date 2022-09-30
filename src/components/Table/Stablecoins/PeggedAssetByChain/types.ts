interface IAssetByChain {
	bridgeInfo: { name: string; link?: string }
	bridgedAmount: string
	bridges: { [bridge: string]: { [key: string]: { [chain: string]: { amount: number } } } }
	change_1d: number
	change_1m: number
	change_7d: number
	circulating: number
	circulatingPrevDay: number
	circulatingPrevMonth: number
	circulatingPrevWeek: number
	depeggedTwoPercent: boolean
	floatingPeg: boolean
	name: string
	pegDeviation?: number
	pegType?: string
	symbol: string
	unreleased: number
}

export interface IPeggedAssetByChainRow extends IAssetByChain {
	subRows?: Array<IAssetByChain>
}
