import type { UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow, UnifiedRowNode } from '../types'
import { aggregateMetrics } from '../utils/aggregation'

const UNKNOWN_LABELS: Record<UnifiedRowHeaderType, string> = {
	protocol: 'Unknown Protocol',
	'parent-protocol': 'Independent',
	chain: 'All Chains',
	category: 'Other'
}

const keyFromValue = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const sortNodes = (nodes: UnifiedRowNode[]): UnifiedRowNode[] => {
	return [...nodes].sort((a, b) => {
		const aValue = a.metrics.tvl ?? 0
		const bValue = b.metrics.tvl ?? 0
		if (bValue === aValue) {
			return a.label.localeCompare(b.label)
		}
		return bValue - aValue
	})
}

const createLeafNode = (row: NormalizedRow, level: number): UnifiedRowNode => ({
	id: row.id,
	type: 'leaf',
	level,
	value: row.displayName ?? row.name,
	label: row.displayName ?? row.name,
	metrics: row.metrics,
	original: row,
	iconUrl: row.logo ?? null,
	category: row.category ?? null,
	chains: row.chains ?? []
})

const getCommonCategory = (rows: NormalizedRow[]): string | null => {
	if (!rows.length) return null
	const firstCategory = rows[0].category
	if (!firstCategory) return null
	for (let i = 1; i < rows.length; i++) {
		if (rows[i].category !== firstCategory) {
			return null
		}
	}
	return firstCategory
}

const getAggregatedChains = (rows: NormalizedRow[]): string[] => {
	const chainSet = new Set<string>()
	for (const row of rows) {
		if (row.chains && row.chains.length) {
			for (const chain of row.chains) {
				chainSet.add(chain)
			}
		}
	}
	return Array.from(chainSet)
}

const getHeaderValue = (row: NormalizedRow, header: UnifiedRowHeaderType) => {
	if (header === 'parent-protocol') {
		const label =
			(row.parentProtocolName && row.parentProtocolName.trim()) || UNKNOWN_LABELS['parent-protocol']
		const key =
			(row.parentProtocolId && row.parentProtocolId.trim()) ||
			(row.protocolId && `self-${row.protocolId}`) ||
			`self-${keyFromValue(row.name || 'protocol')}`
		return { key, label, meta: { groupType: 'parent' } }
	}

	if (header === 'protocol') {
		const label = row.name || UNKNOWN_LABELS.protocol
		const key = row.protocolId ?? keyFromValue(label)
		return { key, label, meta: { groupType: 'protocol' } }
	}

	if (header === 'chain') {
		const label = row.chain && row.chain.trim() ? row.chain : UNKNOWN_LABELS.chain
		return { key: keyFromValue(label), label }
	}

	if (header === 'category') {
		const label = row.category && row.category.trim() ? row.category : UNKNOWN_LABELS.category
		return { key: keyFromValue(label), label }
	}

	return { key: header, label: header }
}

const groupRows = (
	rows: NormalizedRow[],
	headers: UnifiedRowHeaderType[],
	level: number,
	parentKey: string
): UnifiedRowNode[] => {
	if (!headers.length) {
		return rows.map((row) => createLeafNode(row, level))
	}

	const [currentHeader, ...rest] = headers

	if (currentHeader === 'parent-protocol') {
		const withParent = rows.filter((row) => row.parentProtocolId)
		const withoutParent = rows.filter((row) => !row.parentProtocolId)
		const nodes: UnifiedRowNode[] = []

		if (withParent.length) {
			const parentGroups = new Map<
				string,
				{
					label: string
					rows: NormalizedRow[]
				}
			>()

			for (const row of withParent) {
				const parentId = row.parentProtocolId as string
				const label = row.parentProtocolName && row.parentProtocolName.trim().length > 0 ? row.parentProtocolName : UNKNOWN_LABELS['parent-protocol']
				const existing = parentGroups.get(parentId)
				if (existing) {
					existing.rows.push(row)
				} else {
					parentGroups.set(parentId, { label, rows: [row] })
				}
			}

			for (const [parentId, group] of parentGroups.entries()) {
				const nodeId = `${parentKey}|${currentHeader}|${parentId}`
				const children = groupRows(group.rows, rest, level + 1, nodeId)
				const metrics = aggregateMetrics(group.rows)
				const parentLogo =
					group.rows.find((child) => child.parentProtocolLogo)?.parentProtocolLogo ?? null
				const commonCategory = getCommonCategory(group.rows)
				const aggregatedChains = getAggregatedChains(group.rows)

				nodes.push({
					id: nodeId,
					type: 'group',
					level,
					header: currentHeader,
					value: parentId,
					label: group.label,
					metrics,
					children,
					groupKind: 'parent',
					iconUrl: parentLogo,
					category: commonCategory,
					chains: aggregatedChains
				})
			}
		}

		if (withoutParent.length) {
			const directChildren = groupRows(withoutParent, rest, level, parentKey)
			nodes.push(...directChildren)
		}

		return sortNodes(nodes)
	}

	const groups = new Map<
		string,
		{
			label: string
			rows: NormalizedRow[]
			meta?: Record<string, any>
		}
	>()

	for (const row of rows) {
		const { key, label, meta } = getHeaderValue(row, currentHeader)
		const existing = groups.get(key)
		if (existing) {
			existing.rows.push(row)
		} else {
			groups.set(key, { label, rows: [row], meta: meta as Record<string, any> | undefined })
		}
	}

	const nodes: UnifiedRowNode[] = []

	for (const [key, group] of groups.entries()) {
		if (rest.length === 0) {
			const leaves = group.rows.map((row) => createLeafNode(row, level))
			nodes.push(...sortNodes(leaves))
			continue
		}

		const nodeId = `${parentKey}|${currentHeader}|${key}`
		const children = groupRows(group.rows, rest, level + 1, nodeId)
		const metrics = aggregateMetrics(group.rows)
		const commonCategory = getCommonCategory(group.rows)
		const aggregatedChains = getAggregatedChains(group.rows)
		let iconUrl: string | null = null
		if (group.meta?.groupType === 'parent') {
			iconUrl = group.rows.find((row) => row.parentProtocolLogo)?.parentProtocolLogo ?? null
		} else if (currentHeader === 'protocol') {
			iconUrl = group.rows.find((row) => row.logo)?.logo ?? null
		}

		nodes.push({
			id: nodeId,
			type: 'group',
			level,
			header: currentHeader,
			value: key,
			label: group.label,
			metrics,
			children,
			groupKind: group.meta?.groupType === 'parent' ? 'parent' : group.meta?.groupType === 'protocol' ? 'protocol' : undefined,
			iconUrl,
			category: commonCategory,
			chains: aggregatedChains
		})
	}

	return sortNodes(nodes)
}

export function buildHierarchy(rows: NormalizedRow[], headers: UnifiedRowHeaderType[]): UnifiedRowNode[] {
	if (!rows.length) {
		return []
	}

	if (!headers.length) {
		return sortNodes(rows.map((row) => createLeafNode(row, 0)))
	}

	return groupRows(rows, headers, 0, 'root')
}
