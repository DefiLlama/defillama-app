interface IFees {
	name: string
	category: string
	total1dFees: number
	total1dRevenue: number
	logo: string
	symbol?: string
	version?: number
}

export interface IFeesRow extends IFees {
	subRows?: Array<IFees>
}
