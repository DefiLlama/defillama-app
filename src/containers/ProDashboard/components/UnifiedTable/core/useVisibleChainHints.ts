import { useEffect, useState } from 'react'
import type { Table } from '@tanstack/react-table'
import type { UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow } from '../types'
import { getChainNameForRow } from './groupingUtils'

const normalizeChain = (value: string | null | undefined) => (value ? value.trim().toLowerCase() : '')

const haveSameMembers = (a: string[], b: string[]) => {
	if (a.length !== b.length) return false
	const normalizedA = a.map(normalizeChain).filter(Boolean).sort()
	const normalizedB = b.map(normalizeChain).filter(Boolean).sort()
	if (normalizedA.length !== normalizedB.length) return false
	for (let i = 0; i < normalizedA.length; i++) {
		if (normalizedA[i] !== normalizedB[i]) return false
	}
	return true
}

export function useVisibleChainHints(
	table: Table<NormalizedRow>,
	rowHeaders: UnifiedRowHeaderType[],
	maxHints: number = 50
): string[] {
	const [visibleChainHints, setVisibleChainHints] = useState<string[]>([])

	const tableState = table.getState()
	const paginationState = tableState.pagination
	const expandedStateKey = JSON.stringify(tableState.expanded ?? {})
    // Avoid re-running on every sorting change to prevent thrashing
    // when sorting triggers data resort without changing which chains are visible.
    // const sortingStateKey = JSON.stringify(tableState.sorting ?? [])
	const shouldTrackChains = rowHeaders.includes('chain')

	useEffect(() => {
		if (!shouldTrackChains) {
			setVisibleChainHints((prev) => (prev.length ? [] : prev))
			return
		}

		const canonicalChains = new Map<string, string>()
	const addChain = (value: string | null | undefined) => {
		if (!value || value === 'All Chains') return
		const trimmed = value.trim()
		if (!trimmed) return
		const normalized = trimmed.toLowerCase()
		if (!normalized || canonicalChains.has(normalized)) return
		canonicalChains.set(normalized, trimmed)
	}

		const rowModel = table.getRowModel()
		for (const row of rowModel.flatRows) {
			addChain(getChainNameForRow(row))
		}

	const orderedChains = Array.from(canonicalChains.entries())
		.sort((a, b) => a[1].localeCompare(b[1]))
		.slice(0, maxHints)
		.map(([, label]) => label)

		setVisibleChainHints((prev) => {
			if (haveSameMembers(prev, orderedChains)) {
				return prev
			}
			return orderedChains
		})
    }, [
        expandedStateKey,
        paginationState.pageIndex,
        paginationState.pageSize,
        shouldTrackChains,
        table,
        maxHints
    ])

	return visibleChainHints
}
