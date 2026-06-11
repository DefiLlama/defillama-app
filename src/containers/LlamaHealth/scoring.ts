import type { IHealthRow, IRawFeesProtocol, IRawProtocol, IRawRevenueProtocol, ISignalScores } from './types'

const MIN_TVL = 1_000_000
const MIN_AGE_DAYS = 90

/** Percentile rank of value within a sorted array (ascending). Returns 0–1. */
function percentileRank(sorted: number[], value: number): number {
	if (sorted.length === 0) return 0
	let lo = 0
	let hi = sorted.length
	while (lo < hi) {
		const mid = (lo + hi) >>> 1
		if (sorted[mid] < value) lo = mid + 1
		else hi = mid
	}
	return lo / sorted.length
}

/** Returns sorted copy of finite numbers from array. */
function sortedFinite(values: (number | null | undefined)[]): number[] {
	return values.filter((v): v is number => typeof v === 'number' && isFinite(v)).sort((a, b) => a - b)
}

/**
 * Nonlinear consistency score: penalizes large divergence between 1d and
 * annualized 7d change. Score decays exponentially with divergence.
 */
function consistencyScore(change1d: number | null, change7d: number | null): number | null {
	if (change1d == null || change7d == null) return null
	const annualized7d = change7d / 7
	const divergence = Math.abs(change1d - annualized7d)
	// e^(-0.15 * divergence): at divergence=5 → 0.47, at 10 → 0.22, at 0 → 1.0
	return Math.exp(-0.15 * divergence)
}

/** log-scaled chain diversification score: log2(chains+1)/log2(maxChains+1) */
function chainScore(chainCount: number, maxChains: number): number {
	if (maxChains <= 1) return chainCount > 1 ? 1 : 0
	return Math.log2(chainCount + 1) / Math.log2(maxChains + 1)
}

/** log-scaled maturity score capped at 4 years */
function maturityScore(ageDays: number): number {
	const MAX_DAYS = 4 * 365
	return Math.min(1, Math.log(ageDays + 1) / Math.log(MAX_DAYS + 1))
}

/**
 * Confidence weight based on TVL: log10(tvl)/log10(1e9).
 * $1B+ → 1.0, $1M → 0.33, prevents tiny protocols dominating.
 */
function confidenceWeight(tvl: number): number {
	return Math.min(1, Math.log10(Math.max(tvl, 1)) / Math.log10(1e9))
}

interface CategoryIndex {
	change7dSorted: number[]
	fees30dSorted: number[]
	feeTrend30dSorted: number[]
	maxChains: number
}

function buildCategoryIndex(
	protocols: IRawProtocol[],
	feesMap: Map<string, IRawFeesProtocol>
): Map<string, CategoryIndex> {
	const byCategory = new Map<string, { change7d: number[]; fees30d: number[]; feeTrend: number[]; chains: number[] }>()

	for (const p of protocols) {
		const cat = p.category ?? 'Unknown'
		if (!byCategory.has(cat)) byCategory.set(cat, { change7d: [], fees30d: [], feeTrend: [], chains: [] })
		const entry = byCategory.get(cat)!

		if (p.change_7d != null && isFinite(p.change_7d)) entry.change7d.push(p.change_7d)
		entry.chains.push(p.chains.length)

		const fees = feesMap.get(p.name) ?? feesMap.get(p.slug)
		if (fees?.total30d != null && isFinite(fees.total30d) && fees.total30d > 0) entry.fees30d.push(fees.total30d)
		if (fees?.change_30dover30d != null && isFinite(fees.change_30dover30d)) entry.feeTrend.push(fees.change_30dover30d)
	}

	const index = new Map<string, CategoryIndex>()
	for (const [cat, data] of byCategory) {
		index.set(cat, {
			change7dSorted: sortedFinite(data.change7d),
			fees30dSorted: sortedFinite(data.fees30d),
			feeTrend30dSorted: sortedFinite(data.feeTrend),
			maxChains: data.chains.length > 0 ? Math.max(...data.chains) : 1
		})
	}
	return index
}

export interface ISignalWeights {
	tvlMomentum: number
	tvlConsistency: number
	feeGeneration: number
	feeTrend: number
	chainDiversification: number
	auditStatus: number
	maturity: number
}

export const DEFAULT_WEIGHTS: ISignalWeights = {
	tvlMomentum: 1.5,
	tvlConsistency: 1.0,
	feeGeneration: 2.0,
	feeTrend: 1.5,
	chainDiversification: 1.0,
	auditStatus: 1.0,
	maturity: 0.5
}

export function rescoreRows(rows: IHealthRow[], weights: ISignalWeights): IHealthRow[] {
	return rows
		.map((row) => {
			const s = row.signals
			const signalWeights: Array<[number | null, number]> = [
				[s.tvlMomentum, weights.tvlMomentum],
				[s.tvlConsistency, weights.tvlConsistency],
				[s.feeGeneration, weights.feeGeneration],
				[s.feeTrend, weights.feeTrend],
				[s.chainDiversification, weights.chainDiversification],
				[s.auditStatus, weights.auditStatus],
				[s.maturity, weights.maturity]
			]
			let weightedSum = 0
			let totalWeight = 0
			let signalCount = 0
			for (const [value, weight] of signalWeights) {
				if (value != null && weight > 0) {
					weightedSum += value * weight
					totalWeight += weight
					signalCount++
				}
			}
			const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0
			const confidence = confidenceWeight(row.tvl)
			const score = Math.round((rawScore * confidence + 0.5 * (1 - confidence)) * 100)
			return { ...row, score, signalCount }
		})
		.sort((a, b) => b.score - a.score)
}

export function computeHealthRows(
	protocols: IRawProtocol[],
	feesProtocols: IRawFeesProtocol[],
	revenueProtocols: IRawRevenueProtocol[]
): IHealthRow[] {
	const feesMap = new Map<string, IRawFeesProtocol>()
	for (const f of feesProtocols) {
		feesMap.set(f.name, f)
		feesMap.set(f.slug, f)
	}

	const revenueMap = new Map<string, number>()
	for (const r of revenueProtocols) {
		if (r.total30d != null) {
			revenueMap.set(r.name, r.total30d)
			revenueMap.set(r.slug, r.total30d)
		}
	}

	const now = Date.now() / 1000

	// Filter to eligible protocols only before building index
	const eligible = protocols.filter((p) => {
		if (!p.tvl || p.tvl < MIN_TVL) return false
		if (p.listedAt == null) return false
		const ageDays = (now - p.listedAt) / 86400
		if (ageDays < MIN_AGE_DAYS) return false
		return true
	})

	const categoryIndex = buildCategoryIndex(eligible, feesMap)

	const rows: IHealthRow[] = []

	for (const p of eligible) {
		const cat = p.category ?? 'Unknown'
		const idx = categoryIndex.get(cat)!
		const ageDays = p.listedAt != null ? (now - p.listedAt) / 86400 : null
		const fees = feesMap.get(p.name) ?? feesMap.get(p.slug) ?? null
		const revenue30d = revenueMap.get(p.name) ?? revenueMap.get(p.slug) ?? null

		const signals: ISignalScores = {
			tvlMomentum:
				p.change_7d != null && isFinite(p.change_7d) && idx.change7dSorted.length > 0
					? percentileRank(idx.change7dSorted, p.change_7d)
					: null,

			tvlConsistency: consistencyScore(p.change_1d, p.change_7d),

			feeGeneration:
				fees?.total30d != null && fees.total30d > 0 && idx.fees30dSorted.length > 0
					? percentileRank(idx.fees30dSorted, fees.total30d)
					: null,

			feeTrend:
				fees?.change_30dover30d != null && isFinite(fees.change_30dover30d) && idx.feeTrend30dSorted.length > 0
					? percentileRank(idx.feeTrend30dSorted, fees.change_30dover30d)
					: null,

			chainDiversification: chainScore(p.chains.length, idx.maxChains),

			auditStatus: p.audits != null ? (p.audits === '2' || p.audits === '3' || p.audits === '5' ? 1 : 0) : null,

			maturity: ageDays != null ? maturityScore(ageDays) : null
		}

		// Weighted average of available signals
		const signalWeights: Array<[number | null, number]> = [
			[signals.tvlMomentum, 1.5],
			[signals.tvlConsistency, 1.0],
			[signals.feeGeneration, 2.0],
			[signals.feeTrend, 1.5],
			[signals.chainDiversification, 1.0],
			[signals.auditStatus, 1.0],
			[signals.maturity, 0.5]
		]

		let weightedSum = 0
		let totalWeight = 0
		let signalCount = 0
		for (const [value, weight] of signalWeights) {
			if (value != null) {
				weightedSum += value * weight
				totalWeight += weight
				signalCount++
			}
		}

		const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0
		const confidence = confidenceWeight(p.tvl ?? 0)
		// Blend toward 50 (neutral) for low-confidence protocols
		const score = Math.round((rawScore * confidence + 0.5 * (1 - confidence)) * 100)

		rows.push({
			name: p.name,
			slug: p.slug,
			category: cat,
			logo: p.logo,
			tvl: p.tvl ?? 0,
			change7d: p.change_7d,
			fees30d: fees?.total30d ?? null,
			revenue30d,
			chains: p.chains.length,
			audited: p.audits === '2' || p.audits === '3' || p.audits === '5',
			ageDays,
			signals,
			score,
			signalCount
		})
	}

	return rows.sort((a, b) => b.score - a.score)
}

export function getScoreLabel(score: number): { label: string; className: string } {
	if (score >= 75) return { label: 'Healthy', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
	if (score >= 50) return { label: 'Stable', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' }
	if (score >= 25) return { label: 'Risky', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' }
	return { label: 'Weak', className: 'bg-red-500/15 text-red-600 dark:text-red-400' }
}
