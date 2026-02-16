export interface RawTreasuryProtocol {
	id: string
	name: string
	address: string | null
	symbol: string
	url: string
	description: string
	chain: string
	logo: string
	audits: string
	gecko_id: string | number | null
	cmcId: string | number | null
	category: string
	chains: string[]
	module: string
	treasury: string
	twitter: string
	slug: string
	tvl: number
	chainTvls?: Record<string, number>
	change_1h: number | null
	change_1d: number | null
	change_7d: number | null
	tokenBreakdowns?: {
		ownTokens: number
		stablecoins: number
		majors: number
		others: number
	}
	mcap: number | null
}

export type RawTreasuriesResponse = RawTreasuryProtocol[]

export type RawEntitiesResponse = RawTreasuryProtocol[]
