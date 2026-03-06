export interface IRaise {
	name: string
	date: number
	amount: number | null
	round: string
	category: string
	sector: string
	leadInvestors: string[]
	otherInvestors: string[]
	source: string
	valuation: number | null
	chains: string[]
}

export interface IRaisesFilters {
	investors: string[]
	rounds: string[]
	sectors: string[]
	chains: string[]
}

export interface IRaisesPageData extends IRaisesFilters {
	raises: IRaise[]
	investorName: string | null
}

export interface IInvestorRaisesPageData extends IRaisesFilters {
	raises: IRaise[]
	investorName: string
}

export interface IInvestorTimespan {
	topCategory: string | null
	topRound: string | null
	deals: number
	projects: string
	chains: string[]
	medianAmount: number
}

export interface IInvestor {
	name: string
	last30d: IInvestorTimespan
	last180d: IInvestorTimespan
	last1y: IInvestorTimespan
	allTime: IInvestorTimespan
}

export interface IInvestorsPageData {
	investors: IInvestor[]
}
