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
