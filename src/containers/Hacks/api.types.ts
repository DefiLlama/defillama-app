export interface IHackApiItem {
	date: number
	name: string
	classification: string | null
	technique: string | null
	amount: number | null
	chain: string[] | null
	bridgeHack: boolean
	targetType: string
	source?: string
	returnedFunds: number | null
	defillamaId: number | null
	language: string | null
	parentProtocolId?: string
}
