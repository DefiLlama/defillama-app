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
	currentTvl: number
	cleanAssetsTvl: number
	inflows_24h: number
	inflows_1w: number
	inflows_1m: number
	spotVolume: number
	oi: number
	derivVolume: number
	leverage: number
	customRange?: number
}
