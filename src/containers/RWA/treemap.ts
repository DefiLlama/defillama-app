import type { IRWAAssetsOverview, IRWAProject } from './api.types'
import { rwaSlug } from './rwaSlug'

type RWAOverviewMode = 'chain' | 'category' | 'platform'

export type RWAChartType = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'
export type RwaTreemapParentGrouping = 'category' | 'assetClass' | 'assetName' | 'platform' | 'chain'
export type RwaTreemapNestedBy = 'none' | 'assetClass' | 'assetName'
export type RwaPieChartDatum = { name: string; value: number }
export type RwaTreemapNode = {
	name: string
	path: string
	value: [number, number | null, number | null]
	itemStyle?: { color?: string }
	children?: RwaTreemapNode[]
}

const ECHARTS_DEFAULT_COLORS = [
	'#5470C6',
	'#91CC75',
	'#FAC858',
	'#EE6666',
	'#73C0DE',
	'#3BA272',
	'#FC8452',
	'#9A60B4',
	'#EA7CCC'
]

export const TREEMAP_NESTED_BY_OPTIONS = [
	{ key: 'none', name: 'No Grouping' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'assetName', name: 'Asset Name' }
] as const

export const TREEMAP_NESTED_BY_NON_CATEGORY_OPTIONS = TREEMAP_NESTED_BY_OPTIONS.filter(
	(option) => option.key !== 'assetClass'
)

export const validTreemapNestedBy = new Set<RwaTreemapNestedBy>(TREEMAP_NESTED_BY_OPTIONS.map(({ key }) => key))

export const buildRwaTreemapTreeData = (
	pieData: RwaPieChartDatum[],
	breakdownLabel: string
): RwaTreemapNode[] => {
	const data = (pieData ?? [])
		.filter((item) => Number.isFinite(item.value) && item.value > 0)
		.map((item) => ({ ...item, name: sanitizeTreemapLabel(item.name) }))
	if (data.length === 0) return []

	const total = data.reduce((sum, item) => sum + item.value, 0)
	const rootLabel = breakdownLabel || 'Breakdown'
	const colorMap = buildColorMapFromPalette(data.map((item) => item.name))
	const children: RwaTreemapNode[] = data.map((item) => {
		const sharePct = total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0
		return {
			name: item.name,
			path: `${rootLabel}/${item.name}`,
			value: [item.value, sharePct, sharePct],
			itemStyle: { color: colorMap[item.name] }
		}
	})

	return children
}

export const getRwaTreemapParentGrouping = ({
	mode,
	nonTimeSeriesChartBreakdown,
	canBreakdownByChain
}: {
	mode: RWAOverviewMode
	nonTimeSeriesChartBreakdown: string | null
	canBreakdownByChain: boolean
}): RwaTreemapParentGrouping => {
	if (canBreakdownByChain && nonTimeSeriesChartBreakdown === 'chain') return 'chain'
	if (mode === 'chain' && nonTimeSeriesChartBreakdown === 'platform') return 'platform'
	if (mode === 'chain' && nonTimeSeriesChartBreakdown === 'assetClass') return 'assetClass'
	if (mode === 'category') return 'assetClass'
	if (mode === 'platform') return 'assetName'
	return 'category'
}

export const canBuildRwaNestedTreemap = ({
	parentGrouping,
	childGrouping
}: {
	parentGrouping: RwaTreemapParentGrouping
	childGrouping: RwaTreemapNestedBy
}) => {
	if (childGrouping === 'none') return false
	if (parentGrouping === 'assetClass' && childGrouping === 'assetClass') return false
	if (parentGrouping === 'assetName' && childGrouping === 'assetName') return false
	return true
}

export const getTreemapNestedByOptions = (parentGrouping: RwaTreemapParentGrouping) =>
	parentGrouping === 'category' ? TREEMAP_NESTED_BY_OPTIONS : TREEMAP_NESTED_BY_NON_CATEGORY_OPTIONS

export const normalizeTreemapNestedByForParentGrouping = ({
	parentGrouping,
	nestedBy
}: {
	parentGrouping: RwaTreemapParentGrouping
	nestedBy: RwaTreemapNestedBy | null
}): RwaTreemapNestedBy => {
	const defaultNestedBy: RwaTreemapNestedBy = parentGrouping === 'category' ? 'assetClass' : 'none'
	if (!nestedBy) return defaultNestedBy
	if (parentGrouping !== 'category' && nestedBy === 'assetClass') return 'none'
	return nestedBy
}

export const resolveTreemapNestedByOnParentGroupingChange = ({
	currentParentGrouping,
	nextParentGrouping,
	currentNestedBy
}: {
	currentParentGrouping: RwaTreemapParentGrouping
	nextParentGrouping: RwaTreemapParentGrouping
	currentNestedBy: RwaTreemapNestedBy
}): RwaTreemapNestedBy => {
	// Requirement: leaving Asset Category treemap defaults nested submenu to "No Grouping".
	if (currentParentGrouping === 'category' && nextParentGrouping !== 'category') return 'none'
	return normalizeTreemapNestedByForParentGrouping({
		parentGrouping: nextParentGrouping,
		nestedBy: currentNestedBy
	})
}

const getRwaMetricValue = (asset: IRWAProject, metric: RWAChartType): number => {
	if (metric === 'activeMcap') return asset.activeMcap?.total ?? 0
	if (metric === 'defiActiveTvl') return asset.defiActiveTvl?.total ?? 0
	return asset.onChainMcap?.total ?? 0
}

const normalizeLabels = (values: Array<string | null | undefined>): string[] => {
	const out = new Set<string>()
	for (const value of values) {
		const label = typeof value === 'string' ? sanitizeTreemapLabel(value.trim()) : ''
		if (!label) continue
		out.add(label)
	}
	return Array.from(out)
}

const normalizeLabelsBySlug = (values: Array<string | null | undefined>, fallback: string): string[] => {
	const bySlug = new Map<string, string>()

	for (const value of values) {
		const label = typeof value === 'string' ? sanitizeTreemapLabel(value.trim()) : ''
		if (!label) continue
		const key = rwaSlug(label)
		if (!key) continue
		const prev = bySlug.get(key)
		if (!prev || (prev === fallback && label !== fallback)) bySlug.set(key, label)
	}

	if (bySlug.size === 0) return [fallback]
	return Array.from(bySlug.values())
}

const getAssetGroupsByGrouping = (asset: IRWAProject, grouping: RwaTreemapParentGrouping | RwaTreemapNestedBy): string[] => {
	if (grouping === 'none') {
		return []
	}

	if (grouping === 'assetName') {
		return normalizeLabels([asset.assetName || asset.ticker])
	}

	if (grouping === 'assetClass') {
		return normalizeLabels(asset.assetClass ?? [])
	}

	if (grouping === 'category') {
		return normalizeLabels(asset.category ?? [])
	}

	if (grouping === 'platform') {
		const platformRaw = asset.parentPlatform as unknown
		const platformCandidates = Array.isArray(platformRaw) ? platformRaw : [platformRaw]
		return normalizeLabelsBySlug(
			platformCandidates.map((platform) => (typeof platform === 'string' ? platform : null)),
			'Unknown'
		)
	}

	const chains = [
		...(asset.chain ?? []),
		typeof asset.primaryChain === 'string' ? asset.primaryChain : null
	] as Array<string | null | undefined>
	return normalizeLabelsBySlug(chains, 'Unknown')
}

const sanitizeTreemapLabel = (value: string): string => {
	const trimmed = value.trim()
	if (!trimmed) return ''
	const richWrapperMatch = trimmed.match(/^\{[A-Za-z0-9_]+\|([\s\S]+)\}$/)
	return richWrapperMatch ? richWrapperMatch[1] : trimmed
}

const createGeneratedColor = (index: number): string => {
	const hue = (index * 137.508) % 360
	const saturation = 62 + (index % 3) * 8
	// Keep fallback colors away from very light tones (can look white on charts).
	const lightness = 40 + (index % 4) * 4
	return `hsl(${hue.toFixed(2)}deg ${saturation}% ${lightness}%)`
}

const buildColorMapFromPalette = (labels: string[]): Record<string, string> => {
	const colorMap: Record<string, string> = {}
	const orderedLabels = Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b))
	for (const [index, label] of orderedLabels.entries()) {
		colorMap[label] =
			index < ECHARTS_DEFAULT_COLORS.length
				? ECHARTS_DEFAULT_COLORS[index]
				: createGeneratedColor(index - ECHARTS_DEFAULT_COLORS.length)
	}
	return colorMap
}

const getRwaTreemapGroupingLabel = (grouping: RwaTreemapParentGrouping): string => {
	if (grouping === 'assetClass') return 'Asset Class'
	if (grouping === 'assetName') return 'Asset Name'
	if (grouping === 'platform') return 'Asset Platform'
	if (grouping === 'chain') return 'Chain'
	return 'Asset Category'
}

export const buildRwaNestedTreemapTreeData = ({
	assets,
	metric,
	rootLabel,
	parentGrouping,
	childGrouping
}: {
	assets: IRWAAssetsOverview['assets']
	metric: RWAChartType
	rootLabel: string
	parentGrouping: RwaTreemapParentGrouping
	childGrouping: RwaTreemapNestedBy
}): RwaTreemapNode[] => {
	if (childGrouping === 'none') return []

	const nestedTotals = new Map<string, Map<string, number>>()

	for (const asset of assets) {
		const metricValue = getRwaMetricValue(asset, metric)
		if (!Number.isFinite(metricValue) || metricValue <= 0) continue

		const parentGroups = getAssetGroupsByGrouping(asset, parentGrouping)
		const childGroups = getAssetGroupsByGrouping(asset, childGrouping)
		if (parentGroups.length === 0 || childGroups.length === 0) continue

		// Intentional full-count behavior: if an asset belongs to multiple parent/child groups,
		// we add the full metric to each membership. To migrate to split-even, divide metricValue here.
		for (const parentGroup of parentGroups) {
			const childTotals = nestedTotals.get(parentGroup) ?? new Map<string, number>()
			for (const childGroup of childGroups) {
				childTotals.set(childGroup, (childTotals.get(childGroup) ?? 0) + metricValue)
			}
			nestedTotals.set(parentGroup, childTotals)
		}
	}

	if (nestedTotals.size === 0) return []

	const parentRows = Array.from(nestedTotals.entries())
		.map(([parentLabel, childTotals]) => {
			const childRows = Array.from(childTotals.entries())
				.filter(([, value]) => Number.isFinite(value) && value > 0)
				.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

			const parentTotal = childRows.reduce((sum, [, value]) => sum + value, 0)
			return { parentLabel, parentTotal, childRows }
		})
		.filter((row) => row.parentTotal > 0)
		.sort((a, b) => b.parentTotal - a.parentTotal || a.parentLabel.localeCompare(b.parentLabel))

	if (parentRows.length === 0) return []

	const total = parentRows.reduce((sum, row) => sum + row.parentTotal, 0)
	if (!Number.isFinite(total) || total <= 0) return []

	const resolvedRootLabel = rootLabel || getRwaTreemapGroupingLabel(parentGrouping)
	const parentColorMap = buildColorMapFromPalette(parentRows.map((row) => row.parentLabel))
	const childColorMap = buildColorMapFromPalette(
		parentRows.flatMap((row) => row.childRows.map(([childLabel]) => `${row.parentLabel}::${childLabel}`))
	)
	const parentNodes: RwaTreemapNode[] = parentRows.map((row) => {
		const parentPath = `${resolvedRootLabel}/${row.parentLabel}`
		const parentSharePct = Number(((row.parentTotal / total) * 100).toFixed(2))
		const childNodes: RwaTreemapNode[] = row.childRows.map(([childLabel, childTotal]) => {
			const childSharePct = Number(((childTotal / row.parentTotal) * 100).toFixed(2))
			const childShareOfTotalPct = Number(((childTotal / total) * 100).toFixed(2))
			const childKey = `${row.parentLabel}::${childLabel}`
			return {
				name: childLabel,
				path: `${parentPath}/${childLabel}`,
				value: [childTotal, childSharePct, childShareOfTotalPct],
				itemStyle: { color: childColorMap[childKey] }
			}
		})

		return {
			name: row.parentLabel,
			path: parentPath,
			value: [row.parentTotal, parentSharePct, parentSharePct],
			itemStyle: { color: parentColorMap[row.parentLabel] },
			children: childNodes
		}
	})

	return parentNodes
}
