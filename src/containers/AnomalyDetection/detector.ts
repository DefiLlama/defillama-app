import type { IAnomaly, IAnomalyRow, AnomalyType } from './types'

const WARNING_Z = 2
const CRITICAL_Z = 3

function stats(values: number[]): { mean: number; std: number } {
	if (values.length === 0) return { mean: 0, std: 1 }
	const mean = values.reduce((a, b) => a + b, 0) / values.length
	const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
	return { mean, std: Math.sqrt(variance) || 1 }
}

function zScore(value: number, mean: number, std: number): number {
	return (value - mean) / std
}

function makeAnomaly(type: AnomalyType, z: number, change: number, label: string): IAnomaly {
	return {
		type,
		severity: Math.abs(z) >= CRITICAL_Z ? 'critical' : 'warning',
		zScore: Math.abs(z),
		change,
		label
	}
}

interface RawProtocol {
	name: string
	slug: string
	logo: string
	category: string | null
	tvl: number | null
	change_1d: number | null
	change_7d: number | null
}

interface RawFees {
	name: string
	slug: string
	total30d: number | null
	change_30dover30d: number | null
}

export function detectAnomalies(protocols: RawProtocol[], feesProtocols: RawFees[]): IAnomalyRow[] {
	const feesMap = new Map<string, RawFees>()
	for (const f of feesProtocols) {
		feesMap.set(f.name, f)
		feesMap.set(f.slug, f)
	}

	// Only consider protocols with meaningful TVL
	const eligible = protocols.filter((p) => p.tvl != null && p.tvl >= 1_000_000)

	const change1dValues = eligible.map((p) => p.change_1d).filter((v): v is number => v != null && isFinite(v))
	const change7dValues = eligible.map((p) => p.change_7d).filter((v): v is number => v != null && isFinite(v))

	const feeChanges = feesProtocols.map((f) => f.change_30dover30d).filter((v): v is number => v != null && isFinite(v))

	const s1d = stats(change1dValues)
	const s7d = stats(change7dValues)
	const sFee = stats(feeChanges)

	const rows: IAnomalyRow[] = []

	for (const p of eligible) {
		const fees = feesMap.get(p.name) ?? feesMap.get(p.slug) ?? null
		const anomalies: IAnomaly[] = []

		if (p.change_1d != null && isFinite(p.change_1d)) {
			const z = zScore(p.change_1d, s1d.mean, s1d.std)
			if (Math.abs(z) >= WARNING_Z) {
				const type: AnomalyType = z > 0 ? 'tvl-spike' : 'tvl-drop'
				anomalies.push(makeAnomaly(type, z, p.change_1d, z > 0 ? 'TVL Spike' : 'TVL Drop'))
			}
		}

		if (p.change_7d != null && isFinite(p.change_7d)) {
			const z = zScore(p.change_7d, s7d.mean, s7d.std)
			// Only flag 7d if it's critical and 1d didn't already flag it
			if (Math.abs(z) >= CRITICAL_Z && !anomalies.some((a) => a.type === 'tvl-spike' || a.type === 'tvl-drop')) {
				const type: AnomalyType = z > 0 ? 'tvl-spike' : 'tvl-drop'
				anomalies.push(makeAnomaly(type, z, p.change_7d, z > 0 ? 'TVL Spike (7d)' : 'TVL Drop (7d)'))
			}
		}

		if (fees?.change_30dover30d != null && isFinite(fees.change_30dover30d)) {
			const z = zScore(fees.change_30dover30d, sFee.mean, sFee.std)
			if (Math.abs(z) >= WARNING_Z) {
				const type: AnomalyType = z > 0 ? 'fee-spike' : 'fee-drop'
				anomalies.push(makeAnomaly(type, z, fees.change_30dover30d, z > 0 ? 'Fee Spike' : 'Fee Drop'))
			}
		}

		if (anomalies.length === 0) continue

		const maxZScore = Math.max(...anomalies.map((a) => a.zScore))

		rows.push({
			name: p.name,
			slug: p.slug,
			logo: p.logo,
			category: p.category ?? 'Unknown',
			tvl: p.tvl ?? 0,
			change1d: p.change_1d,
			change7d: p.change_7d,
			fees30d: fees?.total30d ?? null,
			feeChange30d: fees?.change_30dover30d ?? null,
			anomalies,
			maxZScore
		})
	}

	return rows.sort((a, b) => b.maxZScore - a.maxZScore)
}
