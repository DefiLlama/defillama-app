export interface ICex {
	name: string
	slug?: string
	coin?: string
	coinSymbol?: string
	walletsLink?: string
	cgId?: string
	cgDeriv?: string
	lastAuditDate?: number
	auditor?: string | null
	auditLink?: string
	currentTvl: number | null
	cleanAssetsTvl: number | null
	inflows_24h: number | null
	inflows_1w: number | null
	inflows_1m: number | null
	spotVolume: number | null
	oi: number | null
	derivVolume: number | null
	leverage: number | null
	customRange?: number
}
