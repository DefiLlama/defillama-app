import type { Top10Holder, HolderHistoryEntry } from './holderTypes'

export type HolderChangeStatus = 'accumulating' | 'reducing' | 'new' | 'steady' | 'unknown'

export interface HolderWithChange extends Top10Holder {
	status: HolderChangeStatus
	balancePctChange: number | null
	balanceStatus: HolderChangeStatus
	balanceChangePct: number | null
}

export interface HolderFlowSummary {
	accumulating: number
	reducing: number
	newCount: number
	steady: number
	unknown: number
}

export interface BalanceFlowSummary {
	accumulating: number
	reducing: number
	newCount: number
	steady: number
	unknown: number
}

const STEADY_THRESHOLD = 0.05 // percentage points

const BALANCE_STEADY_THRESHOLD = 0.5 // percent change in raw balance

function computeBalanceChange(current: string, past: string): { status: HolderChangeStatus; changePct: number | null } {
	const cur = parseFloat(current)
	const prev = parseFloat(past)
	if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) {
		return { status: 'unknown', changePct: null }
	}
	const pctChange = ((cur - prev) / prev) * 100
	if (Math.abs(pctChange) < BALANCE_STEADY_THRESHOLD) {
		return { status: 'steady', changePct: pctChange }
	}
	return {
		status: pctChange > 0 ? 'accumulating' : 'reducing',
		changePct: pctChange
	}
}

export function computeHolderChanges(
	currentHolders: Top10Holder[] | null,
	historyEntries: HolderHistoryEntry[] | null,
	lookbackDays: number = 7
): { holders: HolderWithChange[]; summary: HolderFlowSummary; balanceSummary: BalanceFlowSummary } {
	const emptySummary: HolderFlowSummary = { accumulating: 0, reducing: 0, newCount: 0, steady: 0, unknown: 0 }
	const emptyBalanceSummary: BalanceFlowSummary = { accumulating: 0, reducing: 0, newCount: 0, steady: 0, unknown: 0 }

	if (!currentHolders?.length) {
		return { holders: [], summary: emptySummary, balanceSummary: emptyBalanceSummary }
	}

	const now = Date.now()
	const targetMs = now - lookbackDays * 24 * 60 * 60 * 1000

	let pastHolders: Top10Holder[] | null = null
	if (historyEntries?.length) {
		let bestEntry: HolderHistoryEntry | null = null
		let bestMs = -Infinity
		for (const entry of historyEntries) {
			const entryMs = new Date(entry.timestamp).getTime()
			if (entryMs <= targetMs && entryMs > bestMs && entry.top10Holders?.length) {
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
	const balanceSummary = { ...emptyBalanceSummary }
	const holders: HolderWithChange[] = currentHolders.map((h) => {
		const pastHolder = pastMap.get(h.address.toLowerCase())

		if (!pastHolders) {
			summary.unknown++
			balanceSummary.unknown++
			return {
				...h,
				status: 'unknown' as const,
				balancePctChange: null,
				balanceStatus: 'unknown' as const,
				balanceChangePct: null
			}
		}

		if (!pastHolder) {
			summary.newCount++
			balanceSummary.newCount++
			return {
				...h,
				status: 'new' as const,
				balancePctChange: null,
				balanceStatus: 'new' as const,
				balanceChangePct: null
			}
		}

		// Share-based change
		const shareChange = h.balancePct - pastHolder.balancePct
		let shareStatus: HolderChangeStatus
		if (Math.abs(shareChange) < STEADY_THRESHOLD) {
			shareStatus = 'steady'
			summary.steady++
		} else if (shareChange > 0) {
			shareStatus = 'accumulating'
			summary.accumulating++
		} else {
			shareStatus = 'reducing'
			summary.reducing++
		}

		// Balance-based change
		const { status: balStatus, changePct: balChangePct } = computeBalanceChange(h.balance, pastHolder.balance)
		balanceSummary[balStatus === 'new' ? 'newCount' : balStatus]++

		return {
			...h,
			status: shareStatus,
			balancePctChange: shareChange,
			balanceStatus: balStatus,
			balanceChangePct: balChangePct
		}
	})

	return { holders, summary, balanceSummary }
}
