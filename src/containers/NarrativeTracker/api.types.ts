/** Category info item from the info API */
export interface ICategoryInfoApiItem {
	id: string
	name: string
	mcap: number
	volume1D: number | null
	nbCoins: number
	categoryName?: string
}

/** Coin info item from the coinInfo API */
export interface ICoinInfoApiItem {
	id: string
	name: string
	mcap: number
	volume1D: number | null
	categoryName?: string
}

/** Raw price entry: [coinId, timestamp, price] */
export type PriceEntry = [string, string, string]

/** Time series entry: { date: number; [name]: number } */
export type TimeSeriesEntry = Record<string, number>
