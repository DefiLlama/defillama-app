interface IDexs {
	name: string
	displayName?: string
	chains: Array<string>
	change_1d: number
	change_7d: number
	change_1m: number
	totalVolume24h: number
	volumetvl: number
	dominance: number
}

export interface IDexsRow extends IDexs {
	subRows?: Array<IDexs>
}
