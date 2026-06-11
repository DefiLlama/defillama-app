export interface IRawProtocol {
	name: string
	slug: string
	category: string | null
	chains: string[]
	tvl: number | null
	change_1d: number | null
	change_7d: number | null
	audits: string | null
	listedAt: number | null
	logo: string
}

export interface IRawFeesProtocol {
	name: string
	slug: string
	category: string | null
	total24h: number | null
	total7d: number | null
	total30d: number | null
	total60dto30d: number | null
	change_7dover7d: number | null
	change_30dover30d: number | null
}

export interface IRawRevenueProtocol {
	name: string
	slug: string
	total30d: number | null
}

/** Normalized 0–1 percentile scores per signal. null = data unavailable */
export interface ISignalScores {
	/** Percentile rank of 7d TVL change within category */
	tvlMomentum: number | null
	/** Penalizes erratic 1d vs 7d divergence; higher = more consistent */
	tvlConsistency: number | null
	/** Percentile rank of fees30d within category */
	feeGeneration: number | null
	/** Percentile rank of fee 30d-over-30d growth */
	feeTrend: number | null
	/** log-scaled chain count score */
	chainDiversification: number | null
	/** 1 if audited (audits==='2'), 0 otherwise */
	auditStatus: number | null
	/** log-scaled protocol age score */
	maturity: number | null
}

export interface IHealthRow {
	name: string
	slug: string
	category: string
	logo: string
	tvl: number
	change7d: number | null
	fees30d: number | null
	revenue30d: number | null
	chains: number
	audited: boolean
	ageDays: number | null
	signals: ISignalScores
	/** 0–100 composite score */
	score: number
	/** number of signals that contributed */
	signalCount: number
}

export interface LlamaHealthProps {
	rows: IHealthRow[]
}
