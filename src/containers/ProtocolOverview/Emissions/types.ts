export interface TokenData {
	circSupply: number
	events: Event[]
	gecko_id: string
	maxSupply: number
	mcap: number
	name: string
	protocolId: string
	sources: string[]
	token: string
	totalLocked: number
	unlocksPerDay: number
}
export interface IEmission {
	categories: { documented: Array<string>; realtime: Array<string> }
	categoriesBreakdown: Record<string, string[]>
	chartData: { documented: Array<{ [label: string]: number }>; realtime: Array<{ [label: string]: number }> }
	sources: Array<string>
	notes: Array<string>
	events: Array<{ description: string; timestamp: string; noOfTokens: number[] }>
	hallmarks: { documented: Array<[number, string]>; realtime: Array<[number, string]> }
	tokenPrice: { price?: number | null; symbol?: string | null }
	tokenAllocation: {
		documented: { current: { [category: string]: number }; final: { [category: string]: number } }
		realtime: { current: { [category: string]: number }; final: { [category: string]: number } }
	}
	futures: { openInterest: number; fundingRate: number }
	pieChartData: {
		documented: Array<{
			name: string
			value: number
		}>
		realtime: Array<{
			name: string
			value: number
		}>
	}
	stackColors: { documented: { [stack: string]: string }; realtime: { [stack: string]: string } }
	token?: string
	geckoId?: string
	name: string
	meta: TokenData
}
