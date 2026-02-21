interface RawCex {
	name: string
	slug?: string
	coin?: string | null
	coinSymbol?: string
	walletsLink?: string | null
	cgId?: string | null
	cgDeriv?: string
	cgSpotId?: string
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string
	url?: string
	ownTokens?: string[]
	currentTvl?: number
	cleanAssetsTvl?: number
	inflows_24h?: number
	inflows_1w?: number
	inflows_1m?: number
	spotVolume?: number
	oi?: number
	derivVolume?: number
	leverage?: number
}

export interface RawCexsResponse {
	cexs: RawCex[]
	cg_volume_cexs: string[]
}

export interface RawCexInflowsResponse {
	outflows?: number
}
