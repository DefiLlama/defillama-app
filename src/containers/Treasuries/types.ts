export interface ITreasuryRow {
	name: string
	slug: string
	logo: string
	category: string
	tokenBreakdowns: {
		ownTokens: number
		stablecoins: number
		majors: number
		others: number
	}
	ownTokens: number
	stablecoins: number
	majors: number
	others: number
	coreTvl: number
	tvl: number
	mcap: number | null
	change_1d: number | null
	change_7d: number | null
	change_1m?: number | null
}

export interface INetProjectTreasury {
	name: string
	logo: string
	slug: string
	netTreasury: number
}
