export interface ISale {
	aggregatorAddress?: string | null
	aggregatorName?: string | null
	blockNumber: number
	blockTime: string
	buyer: string
	ethSalePrice: number
	exchangeName: string
	salePrice: number
	seller: string
	tokenId: string
	transactionHash: string
	usdSalePrice: number
}

export interface ICollectionScatterChartProps {
	sales: Array<ISale>
	height?: string
	salesMedian1d: Array<ISale>
	volume: any
}

export interface IOrderBookChartProps {
	chartData: Array<{ orderType: string; price: number; priceTotal: number; avgPrice: number; amount: number }>
	height?: string
}
