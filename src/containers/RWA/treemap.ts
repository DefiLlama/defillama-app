import { CHART_COLORS } from '~/constants/colors'
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

const TREEMAP_COLORS = CHART_COLORS

export const TREEMAP_NESTED_BY_OPTIONS = [
	{ key: 'none', name: 'No Grouping' },
	{ key: 'assetClass', name: 'Asset Class' },
	{ key: 'assetName', name: 'Asset Name' }
] as const

export const TREEMAP_NESTED_BY_NON_CATEGORY_OPTIONS = TREEMAP_NESTED_BY_OPTIONS.filter(
	(option) => option.key !== 'assetClass'
)

export const validTreemapNestedBy = new Set<RwaTreemapNestedBy>(TREEMAP_NESTED_BY_OPTIONS.map(({ key }) => key))

export const buildRwaTreemapTreeData = (pieData: RwaPieChartDatum[], breakdownLabel: string): RwaTreemapNode[] => {
	const totalsByLabel = new Map<string, number>()
	for (const item of pieData ?? []) {
		if (!Number.isFinite(item.value) || item.value <= 0) continue
		const label = sanitizeTreemapLabel(item.name)
		if (!label) continue
		totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + item.value)
	}

	const data = Array.from(totalsByLabel.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
	if (data.length === 0) return []

	const total = data.reduce((sum, item) => sum + item.value, 0)
	const rootLabel = breakdownLabel || 'Breakdown'
	// Assign colors in value-descending order so the biggest block gets CHART_COLORS[0].
	const children: RwaTreemapNode[] = data.map((item, index) => {
		const sharePct = total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0
		const color =
			index < TREEMAP_COLORS.length ? TREEMAP_COLORS[index] : createGeneratedColor(index - TREEMAP_COLORS.length)
		return {
			name: item.name,
			path: `${rootLabel}/${item.name}`,
			value: [item.value, sharePct, sharePct],
			itemStyle: { color }
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

const getAssetGroupsByGrouping = (
	asset: IRWAProject,
	grouping: RwaTreemapParentGrouping | RwaTreemapNestedBy
): string[] => {
	switch (grouping) {
		case 'none':
			return []
		case 'assetName':
			return normalizeLabels([asset.assetName || asset.ticker])
		case 'assetClass':
			return normalizeLabels(asset.assetClass ?? [])
		case 'category':
			return normalizeLabels(asset.category ?? [])
		case 'platform': {
			const platformRaw = asset.parentPlatform as unknown
			const platformCandidates = Array.isArray(platformRaw) ? platformRaw : [platformRaw]
			return normalizeLabelsBySlug(
				platformCandidates.map((platform) => (typeof platform === 'string' ? platform : null)),
				'Unknown'
			)
		}
		case 'chain':
		default: {
			const chains = [
				...(asset.chain ?? []),
				typeof asset.primaryChain === 'string' ? asset.primaryChain : null
			] as Array<string | null | undefined>
			return normalizeLabelsBySlug(chains, 'Unknown')
		}
	}
}

const sanitizeTreemapLabel = (value: string): string => {
	const trimmed = value.trim()
	if (!trimmed) return ''
	const richWrapperMatch = trimmed.match(/^\{[A-Za-z0-9_]+\|([\s\S]+)\}$/)
	return richWrapperMatch ? richWrapperMatch[1] : trimmed
}

/** Convert HSL values to a hex color (#RRGGBB) so downstream helpers (hexToHsl) can parse it. */
const hslToHex = (h: number, s: number, l: number): string => {
	const sNorm = s / 100
	const lNorm = l / 100
	const a = sNorm * Math.min(lNorm, 1 - lNorm)
	const f = (n: number) => {
		const k = (n + h / 30) % 12
		const c = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * Math.max(0, Math.min(1, c)))
			.toString(16)
			.padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}

const createGeneratedColor = (index: number): string => {
	const hue = (index * 137.508) % 360
	const saturation = 62 + (index % 3) * 8
	// Keep fallback colors away from very light tones (can look white on charts).
	const lightness = 40 + (index % 4) * 4
	return hslToHex(hue, saturation, lightness)
}

/**
 * Build a color map for treemap parent groups with maximally-spaced hues.
 * Uses golden angle stepping (137.508°) so consecutive items (which are the
 * biggest, most visually dominant groups) always land ~137.5° apart on the
 * color wheel — guaranteeing distinct hue families for their child shades.
 */
const buildHueSpacedColorMap = (labels: string[]): Record<string, string> => {
	const unique = Array.from(new Set(labels))
	if (unique.length === 0) return {}

	const colorMap: Record<string, string> = {}
	const startHue = 210
	const saturation = 65
	const lightness = 48

	for (let i = 0; i < unique.length; i++) {
		const hue = (startHue + i * 137.508) % 360
		colorMap[unique[i]] = hslToHex(hue, saturation, lightness)
	}
	return colorMap
}

/** Convert a hex color (#RRGGBB) to [hue 0-360, saturation 0-100, lightness 0-100]. */
const hexToHsl = (hex: string): [number, number, number] => {
	const r = parseInt(hex.slice(1, 3), 16) / 255
	const g = parseInt(hex.slice(3, 5), 16) / 255
	const b = parseInt(hex.slice(5, 7), 16) / 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
		else if (max === g) h = ((b - r) / d + 2) / 6
		else h = ((r - g) / d + 4) / 6
	}

	return [h * 360, s * 100, l * 100]
}

/**
 * Derive child shade colors from a parent hex color.
 * Children share the parent's hue family but spread across a wide lightness
 * range with slight hue shifts, producing clearly distinct blocks per group.
 */
const deriveChildShades = (parentHex: string, count: number): string[] => {
	if (count <= 0) return []
	if (count === 1) return [parentHex]

	const [h, s] = hexToHsl(parentHex)

	// Wide lightness spread — from deep shade to medium-light — for maximum
	// visual distinction. Text remains readable via the textBorder outline.
	const minL = 25
	const maxL = 65
	// Keep saturation vivid so the hue stays recognisable at every lightness.
	const childS = Math.max(55, Math.min(85, s))
	const shades: string[] = []

	for (let i = 0; i < count; i++) {
		const ratio = count > 1 ? i / (count - 1) : 0.5
		const childL = minL + ratio * (maxL - minL)
		// Small hue offset per child gives extra distinction when many children.
		const hueOffset = count > 2 ? (i - (count - 1) / 2) * 4 : 0
		const childH = (((h + hueOffset) % 360) + 360) % 360
		shades.push(hslToHex(childH, childS, childL))
	}
	return shades
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
	const parentColorMap = buildHueSpacedColorMap(parentRows.map((row) => row.parentLabel))

	const parentNodes: RwaTreemapNode[] = parentRows.map((row) => {
		const parentPath = `${resolvedRootLabel}/${row.parentLabel}`
		const parentSharePct = Number(((row.parentTotal / total) * 100).toFixed(2))
		const parentColor = parentColorMap[row.parentLabel] ?? TREEMAP_COLORS[0]
		const childShades = deriveChildShades(parentColor, row.childRows.length)
		const childNodes: RwaTreemapNode[] = row.childRows.map(([childLabel, childTotal], childIndex) => {
			const childSharePct = Number(((childTotal / row.parentTotal) * 100).toFixed(2))
			const childShareOfTotalPct = Number(((childTotal / total) * 100).toFixed(2))
			return {
				name: childLabel,
				path: `${parentPath}/${childLabel}`,
				value: [childTotal, childSharePct, childShareOfTotalPct],
				itemStyle: { color: childShades[childIndex] }
			}
		})

		return {
			name: row.parentLabel,
			path: parentPath,
			value: [row.parentTotal, parentSharePct, parentSharePct],
			itemStyle: { color: parentColor },
			children: childNodes
		}
	})

	return parentNodes
}
