export type RawProtocolsResponse = {
	protocols: RawLiteProtocol[]
	chains: string[]
	parentProtocols: RawParentProtocol[]
}

export type RawLiteProtocol = {
	defillamaId: string
	name: string
	mcap?: number | null
	tvl?: number | null
	geckoId?: string | null
	parentProtocol?: string | null
}

export type RawParentProtocol = {
	id: string
	name: string
	gecko_id?: string | null
}

export type RawDimensionsOverviewResponse = {
	protocols: Array<{
		defillamaId: string
		total24h?: number | null
	}>
}
