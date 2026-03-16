import type { HolderHistoryEntry, HolderStatsMap, Top10Holder } from './holderTypes'

// Simple deterministic hash from string to number
function hashCode(str: string): number {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i)
		hash |= 0
	}
	return Math.abs(hash)
}

// Deterministic pseudo-random from seed
function seededRandom(seed: number): () => number {
	let s = seed
	return () => {
		s = (s * 1664525 + 1013904223) & 0x7fffffff
		return s / 0x7fffffff
	}
}

function generateMockAddress(rng: () => number): string {
	let addr = '0x'
	for (let i = 0; i < 40; i++) {
		addr += Math.floor(rng() * 16).toString(16)
	}
	return addr
}

function generateMockTop10(rng: () => number, totalTop10Pct: number): Top10Holder[] {
	const holders: Top10Holder[] = []
	let remaining = totalTop10Pct

	for (let i = 0; i < 10; i++) {
		const isLast = i === 9
		const pct = isLast ? remaining : Math.round(remaining * rng() * 0.5 * 100) / 100
		remaining = Math.round((remaining - pct) * 100) / 100

		holders.push({
			address: generateMockAddress(rng),
			balance: String(Math.floor(rng() * 1e18)),
			balancePct: Math.max(0.01, pct)
		})
	}

	return holders.sort((a, b) => b.balancePct - a.balancePct)
}

export function generateMockHolderStats(configIDs: string[]): HolderStatsMap {
	const result: HolderStatsMap = {}

	for (const id of configIDs) {
		const h = hashCode(id)
		const rng = seededRandom(h)

		const holderCount = Math.floor(rng() * 49950) + 50 // 50–50,000
		rng() // consume seed for determinism
		const top10Pct = Math.floor(rng() * 75 + 10) // 10–85%
		const holderChange7d = Math.floor(rng() * 400 - 200) // -200 to +200
		const holderChange30d = Math.floor(rng() * 1000 - 500) // -500 to +500
		const top10Holders = generateMockTop10(rng, top10Pct)

		result[id] = { holderCount, top10Pct, top10Holders, holderChange7d, holderChange30d }
	}

	return result
}

export function generateMockHolderHistory(configID: string): HolderHistoryEntry[] {
	const h = hashCode(configID)
	const rng = seededRandom(h)

	const entries: HolderHistoryEntry[] = []
	const now = new Date()
	let holderCount = Math.floor(rng() * 49950) + 50
	rng() // consume seed for determinism
	let top10Pct = Math.floor(rng() * 75 + 10)

	for (let i = 89; i >= 0; i--) {
		const date = new Date(now)
		date.setDate(date.getDate() - i)
		const timestamp = date.toISOString().split('T')[0]

		// Random walk
		holderCount = Math.max(10, holderCount + Math.floor((rng() - 0.48) * 100))
		rng() // consume seed for determinism
		top10Pct = Math.min(95, Math.max(5, top10Pct + (rng() - 0.5) * 2))
		const roundedTop10Pct = Math.round(top10Pct * 100) / 100
		const top10Holders = generateMockTop10(rng, roundedTop10Pct)

		entries.push({
			timestamp,
			holderCount,
			top10Pct: roundedTop10Pct,
			top10Holders
		})
	}

	return entries
}
