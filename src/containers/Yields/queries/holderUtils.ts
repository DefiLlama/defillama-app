import type { Top10Holder, HolderHistoryEntry } from './holderTypes'

export type HolderChangeStatus = 'accumulating' | 'reducing' | 'new' | 'steady' | 'unknown'

export interface HolderWithChange extends Top10Holder {
	status: HolderChangeStatus
	balancePctChange: number | null
}

export interface HolderFlowSummary {
	accumulating: number
	reducing: number
	newCount: number
	steady: number
	unknown: number
}

const STEADY_THRESHOLD = 0.5 // percentage points

export function computeHolderChanges(
	currentHolders: Top10Holder[] | null,
	historyEntries: HolderHistoryEntry[] | null,
	lookbackDays: number = 7
): { holders: HolderWithChange[]; summary: HolderFlowSummary } {
	const emptySummary: HolderFlowSummary = { accumulating: 0, reducing: 0, newCount: 0, steady: 0, unknown: 0 }

	if (!currentHolders?.length) {
		return { holders: [], summary: emptySummary }
	}

	const now = Date.now()
	const targetMs = now - lookbackDays * 24 * 60 * 60 * 1000

	let pastHolders: Top10Holder[] | null = null
	if (historyEntries?.length) {
		let bestEntry: HolderHistoryEntry | null = null
		let bestMs = -Infinity
		for (const entry of historyEntries) {
			const entryMs = new Date(entry.timestamp).getTime()
			if (entryMs <= targetMs && entryMs > bestMs) {
				bestMs = entryMs
				bestEntry = entry
			}
		}
		pastHolders = bestEntry?.top10Holders ?? null
	}

	const pastMap = new Map<string, Top10Holder>()
	if (pastHolders) {
		for (const h of pastHolders) {
			pastMap.set(h.address.toLowerCase(), h)
		}
	}

	const summary = { ...emptySummary }
	const holders: HolderWithChange[] = currentHolders.map((h) => {
		const pastHolder = pastMap.get(h.address.toLowerCase())

		if (!pastHolders) {
			summary.unknown++
			return { ...h, status: 'unknown' as const, balancePctChange: null }
		}

		if (!pastHolder) {
			summary.newCount++
			return { ...h, status: 'new' as const, balancePctChange: null }
		}

		const change = h.balancePct - pastHolder.balancePct
		if (Math.abs(change) < STEADY_THRESHOLD) {
			summary.steady++
			return { ...h, status: 'steady' as const, balancePctChange: change }
		} else if (change > 0) {
			summary.accumulating++
			return { ...h, status: 'accumulating' as const, balancePctChange: change }
		} else {
			summary.reducing++
			return { ...h, status: 'reducing' as const, balancePctChange: change }
		}
	})

	return { holders, summary }
}
