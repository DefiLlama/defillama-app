export type AnomalyType = 'tvl-spike' | 'tvl-drop' | 'fee-spike' | 'fee-drop'
export type AnomalySeverity = 'warning' | 'critical'

export interface IAnomaly {
	type: AnomalyType
	severity: AnomalySeverity
	/** z-score magnitude */
	zScore: number
	/** the raw % change that triggered it */
	change: number
	/** human label e.g. "TVL Drop" */
	label: string
}

export interface IAnomalyRow {
	name: string
	slug: string
	logo: string
	category: string
	tvl: number
	change1d: number | null
	change7d: number | null
	fees30d: number | null
	feeChange30d: number | null
	anomalies: IAnomaly[]
	/** highest z-score across all anomalies on this row */
	maxZScore: number
}

export interface AnomalyDetectionProps {
	rows: IAnomalyRow[]
	lastUpdated: string
}
