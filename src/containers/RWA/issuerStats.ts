export function computeHHI(shares: number[]): number {
	if (!shares.length) return 0
	const normalized = normalizeShares(shares)
	let hhi = 0
	for (const s of normalized) hhi += s * s
	return hhi
}

export function computeTopNShare(shares: number[], n: number): number {
	if (!shares.length || n <= 0) return 0
	const normalized = normalizeShares(shares)
	const sorted = normalized.slice().sort((a, b) => b - a)
	let sum = 0
	for (let i = 0; i < Math.min(n, sorted.length); i++) sum += sorted[i]
	return sum
}

export function computeNakamotoCoefficient(shares: number[], threshold: number = 0.5): number {
	if (!shares.length) return 0
	if (threshold <= 0) return 1
	const normalized = normalizeShares(shares)
	const sorted = normalized.slice().sort((a, b) => b - a)
	let sum = 0
	for (let i = 0; i < sorted.length; i++) {
		sum += sorted[i]
		if (sum >= threshold) return i + 1
	}
	return sorted.length
}

function normalizeShares(shares: number[]): number[] {
	const cleaned = shares.map((v) => (Number.isFinite(v) && v > 0 ? v : 0))
	const total = cleaned.reduce((acc, v) => acc + v, 0)
	if (total <= 0) return cleaned.map(() => 0)
	return cleaned.map((v) => v / total)
}
