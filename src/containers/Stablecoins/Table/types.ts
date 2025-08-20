interface IAsset {
	chains: Array<string>
	change_1d: number
	change_7d: number
	change_1m: number
	change_1d_nol: string | null
	change_7d_nol: string | null
	change_1m_nol: string | null
	circulating: number
	circulatingPrevDay: number
	circulatingPrevMonth: number
	circulatingPrevWeek: number
	depeggedTwoPercent: boolean
	floatingPeg: boolean
	gecko_id: string
	mcap: number
	name: string
	pegDeviation?: number
	pegDeviation_1m?: number
	pegMechanism?: string
	pegType?: string
	price: number
	symbol: string
	unreleased: number
	pegDeviationInfo?: {
		timestamp: number
		price: number
		priceSource: number
	}
	deprecated?: boolean
}

export interface IPeggedAssetsRow extends IAsset {
	subRows?: Array<IAsset>
}

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

interface IChain {
	name: string
	change_7d: number
	mcap: number
	dominance: { name: string; value: string }
	minted: number
	mcaptvl: number
}

export interface IPeggedChain extends IChain {
	subRows?: Array<IChain>
}
