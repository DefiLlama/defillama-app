export interface RawRaise {
	date: number
	name: string
	round: string
	amount: number | null
	chains: string[]
	sector: string
	category: string
	categoryGroup: string
	leadInvestors: string[]
	otherInvestors: string[]
	valuation: number | null
	source?: string
	defillamaId?: string
}

export interface RawRaisesResponse {
	raises: RawRaise[]
}
