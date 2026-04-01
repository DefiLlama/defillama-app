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

function safeNumber(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function getGroupLabel(market: IRWAPerpsMarket, grouping: ParentGrouping | ChildGrouping): string {
	return getRWAPerpsSharedBreakdownLabel(market, grouping)
}

function getMetricValue(market: IRWAPerpsMarket, metric: RWAPerpsChartMetricKey): number {
	return metric === 'markets' ? 1 : safeNumber(market[metric])
}

function toShare(value: number, total: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
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

function sortEntries(entries: Array<[string, number]>) {
	return entries
		.filter(([, value]) => Number.isFinite(value) && value > 0)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function buildFlatNodes(entries: Array<[string, number]>): RWAPerpsTreemapNode[] {
	const sortedEntries = sortEntries(entries)
	const total = sortedEntries.reduce((sum, [, value]) => sum + value, 0)

	return sortedEntries.map(([name, value], index) => ({
		name,
		path: name,
		value: [value, toShare(value, total), toShare(value, total)],
		itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] }
	}))
}

function buildNestedNodes(
	parentToChildTotals: Map<string, Map<string, number>>,
	rootLabel: string
): RWAPerpsTreemapNode[] {
	const parentRows = [...parentToChildTotals.entries()]
		.map(([parentLabel, childTotals]) => ({
			parentLabel,
			childRows: sortEntries([...childTotals.entries()])
		}))
		.map((row) => ({
			...row,
			parentTotal: row.childRows.reduce((sum, [, value]) => sum + value, 0)
		}))
		.filter((row) => row.parentTotal > 0)
		.sort((a, b) => b.parentTotal - a.parentTotal || a.parentLabel.localeCompare(b.parentLabel))

	const total = parentRows.reduce((sum, row) => sum + row.parentTotal, 0)

	return parentRows.map((row, parentIndex) => {
		const parentColor = CHART_COLORS[parentIndex % CHART_COLORS.length]
		const childColors = deriveChildColors(parentColor, row.childRows.length)
		const parentPath = `${rootLabel}/${row.parentLabel}`

		return {
			name: row.parentLabel,
			path: parentPath,
			value: [row.parentTotal, toShare(row.parentTotal, total), toShare(row.parentTotal, total)],
			itemStyle: { color: parentColor },
			children: row.childRows.map(([childLabel, childValue], childIndex) => ({
				name: childLabel,
				path: `${parentPath}/${childLabel}`,
				value: [childValue, toShare(childValue, row.parentTotal), toShare(childValue, total)],
				itemStyle: { color: childColors[childIndex] }
			}))
		}
	})
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
		case 'assetClass':
			return 'Asset Class'
		case 'referenceAsset':
			return 'Ref Asset'
		case 'coin':
			return 'Coins'
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

	if (nestedBy === 'none') {
		const totalsByParent = new Map<string, number>()

		for (const market of markets) {
			const value = getMetricValue(market, metric)
			if (value <= 0) continue

			const label = getGroupLabel(market, parentGrouping)
			totalsByParent.set(label, (totalsByParent.get(label) ?? 0) + value)
		}

		return buildFlatNodes([...totalsByParent.entries()])
	}

	return buildNestedTreeData({
		markets,
		metric,
		parentGrouping:
			mode === 'overview'
				? (parentGrouping as RWAPerpsOverviewTreemapBreakdown)
				: (parentGrouping as RWAPerpsVenueTreemapBreakdown),
		nestedBy: nestedBy as ChildGrouping,
		rootLabel: mode === 'overview' ? getRootLabel(parentGrouping) : normalizeLabel(venueLabel, 'Venue')
	})
}

function normalizeLabel(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}
