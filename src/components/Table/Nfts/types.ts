export interface INftsCollectionRow {
	name: string
	chains: Array<string>
	marketplaces: Array<string>
	dailyVolumeUSD: number
	totalVolumeUSD: number
	floorUSD: number
	owners: number
	address: string
	logo: string
	slug: string
	collections: number
	chain: string
	marketplace: string
}

export interface INftCollection {
	name: string
	collectionId: string
	floorPrice: number
	floorPrice1Day: number
	floorPrice7Day: number
	floorPricePctChange1Day: number
	floorPricePctChange7Day: number
	image: string
	onSaleCount: number
	totalSupply: number
	volume1d: number
	volume7d: number
	sales1d: number
}

export interface INftMarketplace {
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
