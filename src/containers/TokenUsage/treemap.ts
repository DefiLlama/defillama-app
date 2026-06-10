import { CHART_COLORS } from '~/constants/colors'

export type TokenUsageTreemapNode = {
	name: string
	path: string
	value: [number, number, number]
	itemStyle?: { color?: string }
	children?: TokenUsageTreemapNode[]
}

export interface TokenUsageTreemapRow {
	name: string
	amountUsd: number
	category?: string
}

const UNCATEGORIZED_LABEL = 'Other'

function safeNumber(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) ? parsed : 0
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

// Builds a category -> protocol treemap tree from token usage rows.
// Parent nodes are categories; children are the protocols within each category.
export function buildTokenUsageTreemapTreeData(
	rows: TokenUsageTreemapRow[],
	rootLabel = 'Token Usage'
): TokenUsageTreemapNode[] {
	if (!rows.length) return []

	const parentToChildTotals = new Map<string, Map<string, number>>()

	for (const row of rows) {
		const value = safeNumber(row.amountUsd)
		if (value <= 0) continue

		const parentLabel = row.category && row.category.trim().length > 0 ? row.category.trim() : UNCATEGORIZED_LABEL
		const childLabel = row.name

		const childTotals = parentToChildTotals.get(parentLabel) ?? new Map<string, number>()
		childTotals.set(childLabel, (childTotals.get(childLabel) ?? 0) + value)
		parentToChildTotals.set(parentLabel, childTotals)
	}

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
