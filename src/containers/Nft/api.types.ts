export type RawNftCollection = {
	collectionId: string
	name: string
	image: string
	floorPrice: number | null
	floorPrice1Day: number | null
	floorPrice7Day: number | null
	floorPricePctChange1Day: number | null
	floorPricePctChange7Day: number | null
	onSaleCount: number | null
	totalSupply: number | null
}

export type RawNftVolume = {
	collection: string
	'1DayVolume'?: number
	'7DayVolume'?: number
	'30DayVolume'?: number
	'1DaySales'?: number
}

export type RawNftMarketplaceStats = {
	exchangeName: string
	'1DayVolume': string
	'7DayVolume': string
	'30DayVolume': string
	'1DaySales': string
	'1DayNbTrades': string
	'7DayNbTrades': string
	'30DayNbTrades': string
	pctOfTotal: string
	weeklyChange: string
}

export type RawNftMarketplaceVolume = {
	day: string
	exchangeName: string
	sum: number
	sumUsd: number
	count: number
	date?: number
}

export type RawCollectionDetail = {
	name: string
	image: string
	totalSupply: number
	projectUrl?: string
	twitterUsername?: string
}

export type RawCollectionStats = {
	day: string
	sum: number
}

export type RawFloorHistoryEntry = {
	timestamp: string
	floorPrice: number
}

export type RawOrderbookEntry = {
	orderType: string
	price: number
	priceTotal: number
	avgPrice: number
	amount: number
}

export type RawRoyalty = {
	collection: string
	usd1D: number | null
	usd7D: number | null
	usd30D: number | null
	usdLifetime: number | null
}

export type RawParentCompany = {
	name: string
	nftCollections: Array<[string, ...unknown[]]>
}
