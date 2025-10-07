export type PricePoint = {
	timestamp: number
	price: number
}

export type TimelinePoint = PricePoint & {
	change: number
	percentChange: number
}

export type ComparisonEntry = {
	id: string
	name: string
	symbol: string
	image?: string
	percentChange: number
	absoluteChange: number
	startPrice: number
	endPrice: number
}
