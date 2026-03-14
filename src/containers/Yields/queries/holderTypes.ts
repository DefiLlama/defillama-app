export interface Top10Holder {
	address: string
	balance: string
	balancePct: number
}

export interface HolderStats {
	holderCount: number | null
	avgPositionUsd: number | null
	top10Pct: number | null
	top10Holders: Top10Holder[] | null
	holderChange7d: number | null
	holderChange30d: number | null
}

export interface HolderHistoryEntry {
	timestamp: string
	holderCount: number | null
	avgPositionUsd: number | null
	top10Pct: number | null
	top10Holders: Top10Holder[] | null
}

export type HolderStatsMap = Record<string, HolderStats>
