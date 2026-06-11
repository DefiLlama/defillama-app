import { CHART_COLORS } from '~/constants/colors'
import type { IRWAPerpsMarket } from './api.types'
import { getRWAPerpsSharedBreakdownLabel } from './breakdownLabels'
import type {
	RWAPerpsChartMetricKey,
	RWAPerpsChartMode,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsTreemapNestedBy,
	RWAPerpsVenueTreemapBreakdown
} from './types'

export type RWAPerpsTreemapNode = {
	name: string
	path: string
	value: [number, number, number]
	itemStyle?: { color?: string }
	children?: RWAPerpsTreemapNode[]
}

type ParentGrouping = RWAPerpsOverviewTreemapBreakdown | RWAPerpsVenueTreemapBreakdown
type ChildGrouping = Exclude<RWAPerpsTreemapNestedBy, 'none'>

function getGroupLabel(market: IRWAPerpsMarket, grouping: ParentGrouping | ChildGrouping): string {
	return getRWAPerpsSharedBreakdownLabel(market, grouping)
}

function getMetricValue(market: IRWAPerpsMarket, metric: RWAPerpsChartMetricKey): number {
	return metric === 'markets' ? 1 : market[metric]
}

function toShare(value: number, total: number): number {
	if (total <= 0) return 0
	return Number(((value / total) * 100).toFixed(2))
}

function hexToRgb(hex: string) {
	const normalized = hex.replace('#', '')
	const expanded =
		normalized.length === 3
			? normalized
					.split('')
					.map((char) => `${char}${char}`)
					.join('')
			: normalized
	const int = Number.parseInt(expanded, 16)
	return {
		r: (int >> 16) & 255,
		g: (int >> 8) & 255,
		b: int & 255
	}
}

function blendColor(hex: string, ratio: number): string {
	const { r, g, b } = hexToRgb(hex)
	const target = 255
	const mix = (channel: number) => Math.round(channel + (target - channel) * ratio)
	return `rgb(${mix(r)} ${mix(g)} ${mix(b)})`
}

function deriveChildColors(parentColor: string, count: number): string[] {
	if (count <= 1) return [parentColor]
	return Array.from({ length: count }, (_, index) => {
		const ratio = 0.12 + (index / Math.max(count - 1, 1)) * 0.34
		return blendColor(parentColor, ratio)
	})
}

function sortEntries(entries: Iterable<[string, number]>) {
	const sortedEntries: Array<[string, number]> = []
	for (const entry of entries) {
		if (entry[1] > 0) sortedEntries.push(entry)
	}
	sortedEntries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
	return sortedEntries
}

function buildFlatNodes(entries: Iterable<[string, number]>, rootLabel: string): RWAPerpsTreemapNode[] {
	const sortedEntries = sortEntries(entries)
	let total = 0
	for (const [, value] of sortedEntries) {
		total += value
	}

	const nodes: RWAPerpsTreemapNode[] = []
	for (let index = 0; index < sortedEntries.length; index++) {
		const [name, value] = sortedEntries[index]
		const share = toShare(value, total)
		nodes.push({
			name,
			path: `${rootLabel}/${name}`,
			value: [value, share, share],
			itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] }
		})
	}
	return nodes
}

function buildNestedNodes(
	parentToChildTotals: Map<string, Map<string, number>>,
	rootLabel: string
): RWAPerpsTreemapNode[] {
	const parentRows: Array<{ parentLabel: string; childRows: Array<[string, number]>; parentTotal: number }> = []
	for (const [parentLabel, childTotals] of parentToChildTotals.entries()) {
		const childRows = sortEntries(childTotals.entries())
		let parentTotal = 0
		for (const [, value] of childRows) {
			parentTotal += value
		}
		if (parentTotal > 0) {
			parentRows.push({ parentLabel, childRows, parentTotal })
		}
	}
	parentRows.sort((a, b) => b.parentTotal - a.parentTotal || a.parentLabel.localeCompare(b.parentLabel))

	let total = 0
	for (const row of parentRows) {
		total += row.parentTotal
	}

	const nodes: RWAPerpsTreemapNode[] = []
	for (let parentIndex = 0; parentIndex < parentRows.length; parentIndex++) {
		const row = parentRows[parentIndex]
		const parentColor = CHART_COLORS[parentIndex % CHART_COLORS.length]
		const childColors = deriveChildColors(parentColor, row.childRows.length)
		const parentPath = `${rootLabel}/${row.parentLabel}`
		const parentShare = toShare(row.parentTotal, total)
		const children: RWAPerpsTreemapNode[] = []

		for (let childIndex = 0; childIndex < row.childRows.length; childIndex++) {
			const [childLabel, childValue] = row.childRows[childIndex]
			children.push({
				name: childLabel,
				path: `${parentPath}/${childLabel}`,
				value: [childValue, toShare(childValue, row.parentTotal), toShare(childValue, total)],
				itemStyle: { color: childColors[childIndex] }
			})
		}

		nodes.push({
			name: row.parentLabel,
			path: parentPath,
			value: [row.parentTotal, parentShare, parentShare],
			itemStyle: { color: parentColor },
			children
		})
	}
	return nodes
}

function buildNestedTreeData({
	markets,
	metric,
	parentGrouping,
	nestedBy,
	rootLabel
}: {
	markets: IRWAPerpsMarket[]
	metric: RWAPerpsChartMetricKey
	parentGrouping: ParentGrouping
	nestedBy: ChildGrouping
	rootLabel: string
}) {
	const parentToChildTotals = new Map<string, Map<string, number>>()

	for (const market of markets) {
		const value = getMetricValue(market, metric)
		if (value <= 0) continue

		const parentLabel = getGroupLabel(market, parentGrouping)
		const childLabel = getGroupLabel(market, nestedBy)

		const childTotals = parentToChildTotals.get(parentLabel) ?? new Map<string, number>()
		childTotals.set(childLabel, (childTotals.get(childLabel) ?? 0) + value)
		parentToChildTotals.set(parentLabel, childTotals)
	}

	return buildNestedNodes(parentToChildTotals, rootLabel)
}

function getRootLabel(grouping: ParentGrouping): string {
	switch (grouping) {
		case 'venue':
			return 'Venue'
		case 'assetGroup':
			return 'Asset Group'
		case 'assetClass':
			return 'Asset Class'
		case 'baseAsset':
			return 'Base Asset'
		case 'contract':
			return 'Contract'
		default:
			return assertNever(grouping)
	}
}

export function buildRWAPerpsTreemapTreeData({
	mode,
	markets,
	metric,
	parentGrouping,
	nestedBy,
	venueLabel
}: {
	mode: RWAPerpsChartMode
	markets: IRWAPerpsMarket[]
	metric: RWAPerpsChartMetricKey
	parentGrouping: ParentGrouping
	nestedBy: RWAPerpsTreemapNestedBy
	venueLabel?: string
}): RWAPerpsTreemapNode[] {
	if (!markets.length) return []
	const rootLabel = mode === 'overview' ? getRootLabel(parentGrouping) : normalizeLabel(venueLabel, 'Venue')

	if (nestedBy === 'none') {
		const totalsByParent = new Map<string, number>()

		for (const market of markets) {
			const value = getMetricValue(market, metric)
			if (value <= 0) continue

			const label = getGroupLabel(market, parentGrouping)
			totalsByParent.set(label, (totalsByParent.get(label) ?? 0) + value)
		}

		return buildFlatNodes(totalsByParent.entries(), rootLabel)
	}

	return buildNestedTreeData({
		markets,
		metric,
		parentGrouping:
			mode === 'overview'
				? (parentGrouping as RWAPerpsOverviewTreemapBreakdown)
				: (parentGrouping as RWAPerpsVenueTreemapBreakdown),
		nestedBy: nestedBy as ChildGrouping,
		rootLabel
	})
}

function normalizeLabel(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}
