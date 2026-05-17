import type * as echarts from 'echarts/core'

// --- Shared profile type (single source of truth) ---

export type PngExportProfile = 'default' | 'scatterWithImageSymbols' | 'treemap' | 'treemapNormalized' | 'hbar'

// --- Constants ---

const IMAGE_EXPORT_WIDTH = 1280
const IMAGE_EXPORT_HEIGHT = 720
const EXPORT_FONT_SIZE = 24
const LEGEND_ITEM_GAP = 20
const LEGEND_ITEM_WIDTH = 48
const BASE_TOP_PADDING = 16
const TREEMAP_EXPORT_SIDE_PADDING = 16
const TREEMAP_EXPORT_BOTTOM_PADDING = 16
const TREEMAP_EXPORT_LABEL_Z = 10000
const EXPORT_TITLE_Z = 10002

// --- Small utilities ---

const approximateTextWidth = (text: string, fontSize: number) => {
	if (!text) return 0
	return text.length * fontSize * 0.6
}

const parsePixelValue = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (trimmed.endsWith('px')) {
			const parsed = Number.parseFloat(trimmed.slice(0, -2))
			if (Number.isFinite(parsed)) return parsed
		}
	}
	return null
}

const hasSeriesType = (options: Record<string, any>, type: string) =>
	Array.isArray(options.series) &&
	options.series.some((s: any) => s != null && typeof s === 'object' && s.type === type)

type Rect = { x: number; y: number; width: number; height: number }

type TreemapViewportExportState =
	| {
			actionType: 'treemapZoomToNode' | 'treemapRootToNode'
			targetNodeId?: string
			targetNodePath?: string[]
	  }
	| { rootRect: Rect; sourceLayout: { width: number; height: number } }

const formatTreemapCurrency = (rawValue?: number) => {
	const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0
	const absValue = Math.abs(value)
	if (absValue >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B'
	if (absValue >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M'
	if (absValue >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K'
	return '$' + value.toFixed(0)
}

function getTreemapNumericValue(rawValue: any): number {
	const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
	const numeric = typeof value === 'number' ? value : Number(value ?? 0)
	return Number.isFinite(numeric) ? numeric : 0
}

function formatTreemapExportLabel(params: any, total: number, sourceFormatter: any): string {
	if (typeof sourceFormatter === 'function') {
		const label = sourceFormatter(params)
		if (label != null && label !== '') return String(label)
	}

	const rawValue = getTreemapNumericValue(params?.value)
	const pct = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0'
	return `{name|${String(params?.name ?? '')}}\n{value|${formatTreemapCurrency(rawValue)} (${pct}%)}`
}

function applyTreemapDataExportLabels(data: any[], label: any, upperLabel: any): any[] {
	return data.map((item) => {
		if (!item || typeof item !== 'object' || Array.isArray(item)) return item
		const itemLabel = item.label ?? {}
		const itemUpperLabel = item.upperLabel ?? {}
		return {
			...item,
			label: {
				...label,
				...itemLabel,
				show: true,
				formatter: typeof itemLabel.formatter === 'function' ? itemLabel.formatter : label.formatter
			},
			upperLabel: {
				...upperLabel,
				...itemUpperLabel,
				show: itemUpperLabel.show ?? upperLabel.show,
				formatter: typeof itemUpperLabel.formatter === 'function' ? itemUpperLabel.formatter : upperLabel.formatter
			},
			...(Array.isArray(item.children)
				? { children: applyTreemapDataExportLabels(item.children, label, upperLabel) }
				: {})
		}
	})
}

function stripRichText(value: string): string {
	return value.replace(/\{[^|{}]+\|([^{}]*)\}/g, '$1')
}

function findTreemapDataNodeByPath(data: any[], path: string[], seriesName: string | undefined): any | null {
	if (path.length === 0) return null
	const startIndex = seriesName && path[0] === seriesName ? 1 : 0
	let nodes = data
	let match: any | null = null

	for (let i = startIndex; i < path.length; i++) {
		match = null
		for (const node of nodes) {
			if (node && typeof node === 'object' && !Array.isArray(node) && node.name === path[i]) {
				match = node
				break
			}
		}
		if (!match) return null
		nodes = Array.isArray(match.children) ? match.children : []
	}

	return match
}

function getTreemapTargetDataRoot(series: any, state: TreemapViewportExportState | null) {
	if (!state || !('actionType' in state) || !state.targetNodePath || state.targetNodePath.length === 0) return null
	if (!Array.isArray(series.data)) return null

	const target = findTreemapDataNodeByPath(series.data, state.targetNodePath, series.name)
	if (!target || typeof target !== 'object' || Array.isArray(target)) return null

	return {
		name: typeof target.name === 'string' && target.name ? target.name : series.name,
		data:
			Array.isArray(target.children) && target.children.length > 0
				? target.children
				: [{ ...target, children: undefined }]
	}
}

function getTreemapNodePath(node: any): string[] {
	const ancestors = node?.getAncestors?.(true)
	if (!Array.isArray(ancestors)) return []
	const path: string[] = []
	for (const ancestor of ancestors) {
		const name = ancestor?.name
		if (typeof name === 'string' && name) path.push(name)
	}
	return path
}

function getStashedTreemapTarget(chart: echarts.ECharts): TreemapViewportExportState | null {
	const target = (chart as any).__llamaTreemapFocusNode
	if (target && typeof target === 'object') {
		const targetNodeId = typeof target.id === 'string' && target.id ? target.id : undefined
		const targetNodePath = Array.isArray(target.path) ? target.path.filter((item: any) => typeof item === 'string') : []
		if (targetNodeId || targetNodePath.length > 0) {
			return {
				actionType: 'treemapZoomToNode',
				...(targetNodeId ? { targetNodeId } : {}),
				...(targetNodePath.length > 0 ? { targetNodePath } : {})
			}
		}
	}

	const legacyTargetNodeId = (chart as any).__llamaTreemapFocusNodeId
	return typeof legacyTargetNodeId === 'string' && legacyTargetNodeId
		? { actionType: 'treemapZoomToNode', targetNodeId: legacyTargetNodeId }
		: null
}

// --- Series flags ---

interface SeriesFlags {
	isSankeyChart: boolean
	isPieChart: boolean
	isTreemapChart: boolean
	isScatterChart: boolean
	isHorizontalBarChart: boolean
	yAxisConfig: any
}

function detectSeriesFlags(options: Record<string, any>): SeriesFlags {
	const yAxisConfig = Array.isArray(options.yAxis) ? options.yAxis[0] : options.yAxis
	return {
		isSankeyChart: hasSeriesType(options, 'sankey'),
		isPieChart: hasSeriesType(options, 'pie'),
		isTreemapChart: hasSeriesType(options, 'treemap'),
		isScatterChart: hasSeriesType(options, 'scatter'),
		isHorizontalBarChart: hasSeriesType(options, 'bar') && yAxisConfig?.type === 'category',
		yAxisConfig
	}
}

function getTreemapSeriesModel(chart: echarts.ECharts): any {
	const model = (chart as any).getModel?.()
	const series = model?.getSeriesByType?.('treemap')
	return Array.isArray(series) ? series[0] : undefined
}

function resolveTreemapTargetNodeId(seriesModel: any, state: TreemapViewportExportState): string | null {
	if (!('actionType' in state)) return null

	const root = seriesModel?.getData?.()?.tree?.root
	if (!root) return state.targetNodeId ?? null

	if (state.targetNodeId && root.getNodeById?.(state.targetNodeId)) return state.targetNodeId

	if (!state.targetNodePath || state.targetNodePath.length === 0) return null

	let resolvedId: string | null = null
	root.eachNode?.((node: any) => {
		const path = getTreemapNodePath(node)
		if (path.length !== state.targetNodePath?.length) return
		for (let i = 0; i < path.length; i++) {
			if (path[i] !== state.targetNodePath[i]) return
		}
		const id = node.getId?.()
		if (typeof id === 'string' && id) resolvedId = id
		return true
	})

	return resolvedId
}

function getFiniteRect(value: any): Rect | null {
	const x = Number(value?.x ?? 0)
	const y = Number(value?.y ?? 0)
	const width = Number(value?.width)
	const height = Number(value?.height)
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null
	if (width <= 0 || height <= 0) return null
	return { x, y, width, height }
}

function readTreemapViewportExportState(chart: echarts.ECharts): TreemapViewportExportState | null {
	// Treemap export goals:
	// 1. Always export from the fixed 1280x720 clone so PNG size/aspect do not depend on browser width.
	// 2. Preserve the user's current zoom/drill target by transferring treemap state, not by screenshotting the live canvas.
	// 3. Keep the root/default view as the standard full treemap export.
	// 4. Keep labels visible in the exported PNG; normalized sizing is not useful if labels disappear.
	// 5. Reserve export gutters/title space and mask zoom overflow, because ECharts treemap does not clip to its box.
	const seriesModel = getTreemapSeriesModel(chart)
	if (!seriesModel) return null

	const clickedNode = getStashedTreemapTarget(chart)
	if (clickedNode) return clickedNode

	const viewRoot = seriesModel.getViewRoot?.()
	const rawRoot = seriesModel.getData?.()?.tree?.root
	const viewRootId = viewRoot && viewRoot !== rawRoot ? viewRoot.getId?.() : undefined
	const viewRootPath = viewRoot && viewRoot !== rawRoot ? getTreemapNodePath(viewRoot) : []
	if (typeof viewRootId === 'string' && viewRootId) {
		return {
			actionType: 'treemapRootToNode',
			targetNodeId: viewRootId,
			...(viewRootPath.length > 0 ? { targetNodePath: viewRootPath } : {})
		}
	}

	const layoutInfo = seriesModel?.layoutInfo
	const sourceWidth = Number(layoutInfo?.width)
	const sourceHeight = Number(layoutInfo?.height)
	if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
		return null
	}

	const root = seriesModel?.getData?.()?.tree?.root
	const rootRect = getFiniteRect(root?.getLayout?.())
	if (!rootRect) return null

	const isDefaultView =
		Math.abs(rootRect.x) <= 1 &&
		Math.abs(rootRect.y) <= 1 &&
		Math.abs(rootRect.width - sourceWidth) <= 1 &&
		Math.abs(rootRect.height - sourceHeight) <= 1
	if (isDefaultView) return null

	return {
		rootRect,
		sourceLayout: { width: sourceWidth, height: sourceHeight }
	}
}

function applyTreemapViewportExportState(chart: echarts.ECharts, state: TreemapViewportExportState): boolean {
	const seriesModel = getTreemapSeriesModel(chart)
	if (!seriesModel) return false

	if ('actionType' in state) {
		const targetNodeId = resolveTreemapTargetNodeId(seriesModel, state)
		if (!targetNodeId) return false
		chart.dispatchAction({
			type: state.actionType,
			seriesId: seriesModel.id,
			targetNodeId
		} as any)
		return true
	}

	const layoutInfo = seriesModel.layoutInfo
	const width = Number(layoutInfo?.width)
	const height = Number(layoutInfo?.height)
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false

	const scaleX = width / state.sourceLayout.width
	const scaleY = height / state.sourceLayout.height
	chart.dispatchAction({
		type: 'treemapRender',
		seriesId: seriesModel.id,
		rootRect: {
			x: state.rootRect.x * scaleX,
			y: state.rootRect.y * scaleY,
			width: state.rootRect.width * scaleX,
			height: state.rootRect.height * scaleY
		}
	} as any)
	return true
}

function getGraphicArray(graphic: any): any[] {
	if (!graphic) return []
	return Array.isArray(graphic) ? graphic : [graphic]
}

function buildTreemapExportLabelGraphics(chart: echarts.ECharts, isDark: boolean): any[] {
	const seriesModel = getTreemapSeriesModel(chart)
	const viewRoot = seriesModel?.getViewRoot?.()
	const layoutInfo = seriesModel?.layoutInfo
	if (!seriesModel || !viewRoot || !layoutInfo) return []

	const graphics: any[] = []
	const baseX = Number(layoutInfo.x ?? 0)
	const baseY = Number(layoutInfo.y ?? 0)
	const labelFill = '#fff'
	const labelStroke = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)'

	const getNodeLabel = (node: any, includeValue: boolean) => {
		const formatted = stripRichText(String(seriesModel.getFormattedLabel?.(node.dataIndex, 'normal') ?? '')).trim()
		if (formatted) return formatted
		const name = typeof node.name === 'string' ? node.name : ''
		if (!includeValue) return name
		const value = getTreemapNumericValue(node.getValue?.())
		return value > 0 ? `${name}\n${formatTreemapCurrency(value)}` : name
	}

	const addText = (node: any, x: number, y: number, width: number, height: number, includeValue: boolean) => {
		const text = getNodeLabel(node, includeValue)
		if (!text || width < 32 || height < 14) return
		graphics.push({
			id: `treemap-export-label-${graphics.length}`,
			type: 'text',
			left: x,
			top: y,
			z: TREEMAP_EXPORT_LABEL_Z,
			silent: true,
			style: {
				text,
				fill: labelFill,
				stroke: labelStroke,
				lineWidth: 3,
				fontSize: includeValue ? 12 : 13,
				fontWeight: includeValue ? 500 : 600,
				lineHeight: includeValue ? 16 : 15,
				width: Math.max(width, 0),
				height: Math.max(height, 0),
				overflow: 'truncate',
				lineOverflow: 'truncate'
			}
		})
	}

	const visit = (node: any, parentX: number, parentY: number, isRoot: boolean) => {
		const layout = node?.getLayout?.()
		if (!layout?.isInView) return

		const x = parentX + Number(layout.x ?? 0)
		const y = parentY + Number(layout.y ?? 0)
		const width = Number(layout.width ?? 0)
		const height = Number(layout.height ?? 0)
		const borderWidth = Number(layout.borderWidth ?? 0)
		const upperLabelHeight = Number(layout.upperLabelHeight ?? 0)
		const children = Array.isArray(node.viewChildren) ? node.viewChildren : []
		const isParent = children.length > 0

		if (!isRoot) {
			if (isParent && upperLabelHeight > 0) {
				addText(node, x + borderWidth + 4, y + 2, width - borderWidth * 2 - 8, upperLabelHeight - 4, false)
			} else {
				addText(
					node,
					x + borderWidth + 6,
					y + borderWidth + 4,
					width - borderWidth * 2 - 12,
					height - borderWidth * 2 - 8,
					true
				)
			}
		}

		for (const child of children) {
			visit(child, x, y, false)
		}
	}

	visit(viewRoot, baseX, baseY, true)
	return graphics
}

// --- PNG rasterization ---

/**
 * ECharts' SVG painter ignores the `type` param and always returns an SVG data URL
 * from getDataURL(). This helper detects that case and rasterizes the SVG to a PNG
 * asynchronously (Image.onload + Canvas), which getDataURL() can't do internally
 * because it's synchronous.
 */
async function getChartPngDataURL(
	chart: echarts.ECharts,
	opts: { pixelRatio?: number; backgroundColor?: string; excludeComponents?: string[] }
): Promise<string> {
	const { pixelRatio = 2, backgroundColor = '#ffffff', excludeComponents } = opts

	const dataURL = chart.getDataURL({
		type: 'png',
		pixelRatio,
		backgroundColor,
		excludeComponents
	})

	if (dataURL.startsWith('data:image/png')) {
		return dataURL
	}

	const img = new Image()
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve()
		img.onerror = reject
		img.src = dataURL
	})

	const w = img.naturalWidth || img.width
	const h = img.naturalHeight || img.height
	const canvas = document.createElement('canvas')
	canvas.width = w * pixelRatio
	canvas.height = h * pixelRatio
	const ctx = canvas.getContext('2d')
	if (!ctx) return dataURL

	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.scale(pixelRatio, pixelRatio)
	ctx.drawImage(img, 0, 0, w, h)

	return canvas.toDataURL('image/png')
}

// --- Category logo overlay (for charts with axis logos) ---

const EXPORT_CATEGORY_LOGO_SIZE = 44
const EXPORT_CATEGORY_LOGO_GAP = 16
const EXPORT_HBAR_LOGO_SIZE = 36
const EXPORT_HBAR_LOGO_GAP = 12
const EXPORT_HBAR_LEFT_PAD = 16
const EXPORT_HBAR_LABEL_FONT = `${EXPORT_FONT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
const EXPORT_HBAR_LABEL_MAX_WIDTH = 360

type ChartLogosData =
	| { kind: 'cartesian-x'; logos: string[]; categoryValues: any[] }
	| { kind: 'hbar'; logos: string[]; categories: string[] }

function readStashedChartLogos(chart: echarts.ECharts): ChartLogosData | undefined {
	const data = (chart as any).__llamaChartLogos
	if (!data || typeof data !== 'object') return undefined
	if (data.kind === 'cartesian-x' && Array.isArray(data.logos) && Array.isArray(data.categoryValues)) {
		return data
	}
	if (data.kind === 'hbar' && Array.isArray(data.logos) && Array.isArray(data.categories)) {
		return data
	}
	return undefined
}

async function loadProxiedImage(url: string): Promise<HTMLImageElement | null> {
	if (!url) return null
	try {
		const response = await fetch(`/api/icon-proxy?url=${encodeURIComponent(url)}`)
		if (!response.ok) return null
		const blob = await response.blob()
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				if (typeof reader.result === 'string') resolve(reader.result)
				else reject(new Error('Failed to read icon'))
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
		const img = new Image()
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve()
			img.onerror = reject
			img.src = dataUrl
		})
		return img
	} catch {
		return null
	}
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
	if (ctx.measureText(text).width <= maxWidth) return text
	let lo = 0
	let hi = text.length
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1
		if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid
		else hi = mid - 1
	}
	return lo > 0 ? text.slice(0, lo) + '…' : text
}

async function composeLogoOverlay(opts: {
	baseDataURL: string
	tempChart: echarts.ECharts
	logosData: ChartLogosData
	isDark: boolean
	gridBottom: number
	chartCssWidth: number
	chartCssHeight: number
}): Promise<string> {
	const { baseDataURL, tempChart, logosData, isDark, gridBottom, chartCssWidth, chartCssHeight } = opts

	const loadedImgs = await Promise.all(
		logosData.logos.map((url) => (url ? loadProxiedImage(url) : Promise.resolve(null)))
	)

	const chartImg = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = baseDataURL
	})

	const dpr = chartImg.width / chartCssWidth
	const canvas = document.createElement('canvas')
	canvas.width = chartImg.width
	canvas.height = chartImg.height
	const ctx = canvas.getContext('2d')
	if (!ctx) return baseDataURL

	ctx.drawImage(chartImg, 0, 0)
	ctx.scale(dpr, dpr)

	const logoBgColor = isDark ? '#1a1a1a' : '#ffffff'

	if (logosData.kind === 'cartesian-x') {
		const centerY = chartCssHeight - gridBottom + EXPORT_CATEGORY_LOGO_GAP / 2 + EXPORT_CATEGORY_LOGO_SIZE / 2
		for (let i = 0; i < logosData.categoryValues.length; i++) {
			const img = loadedImgs[i]
			if (!img) continue
			const catVal = logosData.categoryValues[i]
			if (catVal == null) continue
			const x = tempChart.convertToPixel({ xAxisIndex: 0 }, catVal as any)
			if (typeof x !== 'number' || !Number.isFinite(x)) continue
			ctx.save()
			ctx.beginPath()
			ctx.arc(x, centerY, EXPORT_CATEGORY_LOGO_SIZE / 2, 0, 2 * Math.PI)
			ctx.fillStyle = logoBgColor
			ctx.fill()
			ctx.clip()
			ctx.drawImage(
				img,
				x - EXPORT_CATEGORY_LOGO_SIZE / 2,
				centerY - EXPORT_CATEGORY_LOGO_SIZE / 2,
				EXPORT_CATEGORY_LOGO_SIZE,
				EXPORT_CATEGORY_LOGO_SIZE
			)
			ctx.restore()
		}
	} else {
		ctx.font = EXPORT_HBAR_LABEL_FONT
		ctx.textBaseline = 'middle'
		ctx.fillStyle = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
		const textX = EXPORT_HBAR_LEFT_PAD + EXPORT_HBAR_LOGO_SIZE + EXPORT_HBAR_LOGO_GAP
		for (let i = 0; i < logosData.categories.length; i++) {
			const y = tempChart.convertToPixel({ yAxisIndex: 0 }, i)
			if (typeof y !== 'number' || !Number.isFinite(y)) continue
			const img = loadedImgs[i]
			if (img) {
				ctx.save()
				ctx.beginPath()
				ctx.arc(EXPORT_HBAR_LEFT_PAD + EXPORT_HBAR_LOGO_SIZE / 2, y, EXPORT_HBAR_LOGO_SIZE / 2, 0, 2 * Math.PI)
				ctx.fillStyle = logoBgColor
				ctx.fill()
				ctx.clip()
				ctx.drawImage(
					img,
					EXPORT_HBAR_LEFT_PAD,
					y - EXPORT_HBAR_LOGO_SIZE / 2,
					EXPORT_HBAR_LOGO_SIZE,
					EXPORT_HBAR_LOGO_SIZE
				)
				ctx.restore()
			}
			const text = truncateToWidth(ctx, logosData.categories[i], EXPORT_HBAR_LABEL_MAX_WIDTH)
			ctx.fillText(text, textX, y)
		}
	}

	return canvas.toDataURL('image/png')
}

async function composeTreemapExportFrame(opts: {
	baseDataURL: string
	title: string | undefined
	iconBase64: string | null
	isDark: boolean
	topInset: number
	exportHeight: number
}): Promise<string> {
	const { baseDataURL, title, iconBase64, isDark, topInset, exportHeight } = opts

	const chartImg = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = baseDataURL
	})

	const dpr = chartImg.width / IMAGE_EXPORT_WIDTH
	const canvas = document.createElement('canvas')
	canvas.width = chartImg.width
	canvas.height = chartImg.height
	const ctx = canvas.getContext('2d')
	if (!ctx) return baseDataURL

	ctx.drawImage(chartImg, 0, 0)
	ctx.scale(dpr, dpr)

	const backgroundColor = isDark ? '#0b1214' : '#ffffff'
	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, IMAGE_EXPORT_WIDTH, Math.max(0, topInset))
	ctx.fillRect(0, topInset, TREEMAP_EXPORT_SIDE_PADDING, exportHeight - topInset)
	ctx.fillRect(
		IMAGE_EXPORT_WIDTH - TREEMAP_EXPORT_SIDE_PADDING,
		topInset,
		TREEMAP_EXPORT_SIDE_PADDING,
		exportHeight - topInset
	)
	ctx.fillRect(0, exportHeight - TREEMAP_EXPORT_BOTTOM_PADDING, IMAGE_EXPORT_WIDTH, TREEMAP_EXPORT_BOTTOM_PADDING)

	if (title) {
		let textX = 14
		if (iconBase64) {
			try {
				const icon = await new Promise<HTMLImageElement>((resolve, reject) => {
					const img = new Image()
					img.onload = () => resolve(img)
					img.onerror = reject
					img.src = iconBase64
				})
				ctx.drawImage(icon, textX, BASE_TOP_PADDING, 32, 32)
				textX += 40
			} catch {
				// Ignore icon failures; the title is still the important export label.
			}
		}
		ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
		ctx.textBaseline = 'top'
		ctx.fillStyle = isDark ? '#ffffff' : '#000000'
		ctx.fillText(title, textX, BASE_TOP_PADDING)
	}

	return canvas.toDataURL('image/png')
}

function computeHBarLeftGridForExport(categories: string[]): number {
	const c = document.createElement('canvas').getContext('2d')
	if (!c) return EXPORT_HBAR_LEFT_PAD + EXPORT_HBAR_LOGO_SIZE + EXPORT_HBAR_LOGO_GAP + EXPORT_HBAR_LABEL_MAX_WIDTH + 16
	c.font = EXPORT_HBAR_LABEL_FONT
	let maxW = 0
	for (const cat of categories) {
		const w = Math.ceil(c.measureText(cat).width)
		if (w > maxW) maxW = w
	}
	const labelW = Math.min(maxW, EXPORT_HBAR_LABEL_MAX_WIDTH)
	return EXPORT_HBAR_LEFT_PAD + EXPORT_HBAR_LOGO_SIZE + EXPORT_HBAR_LOGO_GAP + labelW + 16
}

// --- Icon loading ---

async function loadCircularIcon(url: string): Promise<string | null> {
	const slugMatch = url.match(/\/protocols\/([^?]+)/)
	const slug = slugMatch?.[1]
	if (!slug) return null

	try {
		const response = await fetch(`/api/protocol-icon?slug=${encodeURIComponent(slug)}`)
		if (!response.ok) return null

		const blob = await response.blob()
		const base64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result)
					return
				}
				reject(new Error('Failed to convert icon to base64'))
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		const img = new Image()
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve()
			img.onerror = reject
			img.src = base64
		})

		const canvas = document.createElement('canvas')
		canvas.width = img.width
		canvas.height = img.height
		const ctx = canvas.getContext('2d')
		if (!ctx) return base64

		ctx.beginPath()
		ctx.arc(img.width / 2, img.height / 2, Math.min(img.width, img.height) / 2, 0, 2 * Math.PI)
		ctx.closePath()
		ctx.clip()
		ctx.drawImage(img, 0, 0)
		return canvas.toDataURL()
	} catch {
		return null
	}
}

// --- Axis scaling for export ---

function scaleXAxisForExport(xAxis: any[]): any[] {
	return xAxis.map((axis) => {
		const scaled: any = {
			...axis,
			nameTextStyle: { ...(axis.nameTextStyle ?? {}), fontSize: EXPORT_FONT_SIZE },
			axisLabel: { ...(axis.axisLabel ?? {}), fontSize: EXPORT_FONT_SIZE, inside: false, hideOverlap: true }
		}
		if (axis.name) {
			scaled.nameGap = Math.max(axis.nameGap ?? 15, 36)
		}
		return scaled
	})
}

function scaleYAxisForExport(yAxis: any[], isHorizontalBarChart: boolean): any[] {
	return yAxis.map((axis) => {
		const scaled: any = {
			...axis,
			nameTextStyle: { ...(axis.nameTextStyle ?? {}), fontSize: EXPORT_FONT_SIZE },
			axisLabel: { ...(axis.axisLabel ?? {}), fontSize: EXPORT_FONT_SIZE, inside: false, hideOverlap: true },
			axisLine: {
				...(axis.axisLine ?? {}),
				lineStyle: { ...(axis.axisLine?.lineStyle ?? {}), width: 2 }
			}
		}
		if (axis.offset) {
			scaled.offset = axis.offset * 2
		}
		if (axis.name) {
			scaled.nameGap = Math.max(axis.nameGap ?? 15, 36)
		}
		if (isHorizontalBarChart && axis.type === 'category') {
			scaled.boundaryGap = ['4%', '4%']
		}
		return scaled
	})
}

// --- Graphic (watermark) scaling for export ---

function scaleGraphicForExport(graphic: any[]): any[] {
	return graphic.map((g) => {
		if (!g.elements) return g
		return {
			...g,
			elements: g.elements.map((element: any) => {
				if (!element.style?.image?.startsWith('/assets/defillama-')) return element
				const targetHeight = 80
				const imageWidth = Math.round((389 / 133) * targetHeight)
				return {
					...element,
					style: { ...element.style, height: targetHeight, width: imageWidth },
					top: '320px',
					left: `${(IMAGE_EXPORT_WIDTH - imageWidth) / 2}px`
				}
			})
		}
	})
}

// --- Legend item collection ---

function collectLegendItems(options: Record<string, any>, isPieChart: boolean): string[] {
	const legendConfig = options.legend
	const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []

	if (legendArray.length > 0 && Array.isArray(legendArray[0]?.data)) {
		return legendArray[0].data.filter((x: any) => typeof x === 'string')
	}
	if (isPieChart && Array.isArray(options.series)) {
		return options.series
			.filter((s: any) => s.type === 'pie')
			.flatMap((s: any) => (Array.isArray(s.data) ? s.data.flatMap((d: any) => (d?.name ? [d.name] : [])) : []))
	}
	if (Array.isArray(options.series)) {
		return options.series.flatMap((s: any) => (s.name ? [s.name] : []))
	}
	return []
}

function isLegendVisibleForExport(flags: SeriesFlags, options: Record<string, any>): boolean {
	if (flags.isSankeyChart || flags.isTreemapChart) return false
	if (flags.isPieChart) {
		const legendConfig = options.legend
		const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []
		return legendArray.length > 0 ? legendArray.some((l: any) => l?.show !== false) : false
	}
	return true
}

// --- Export layout computation ---

interface ExportLayout {
	gridTop: number
	legendTop: number
	canShareRow: boolean
	hasLegend: boolean
	legendRows: number
	totalLegendWidth: number
}

function computeExportLayout(opts: {
	title: string | undefined
	legendItems: string[]
	shouldShowLegend: boolean
	hasIcon: boolean
	expandLegend: boolean | undefined
}): ExportLayout {
	const { title, legendItems, shouldShowLegend, hasIcon, expandLegend } = opts

	const totalLegendWidth = legendItems.reduce(
		(total, name) => total + approximateTextWidth(name, EXPORT_FONT_SIZE) + LEGEND_ITEM_WIDTH + LEGEND_ITEM_GAP,
		0
	)

	const hasLegend = shouldShowLegend && legendItems.length > 1
	const availableWidth = IMAGE_EXPORT_WIDTH - 32
	let legendRows = 1
	if (expandLegend) {
		legendRows = Math.max(1, Math.ceil(totalLegendWidth / availableWidth))
	}

	const titleHeight = title ? 36 : 0
	const singleRowHeight = 32
	const legendHeight = hasLegend ? singleRowHeight * legendRows : 0
	const verticalGap = 16
	const titleWidth = title ? approximateTextWidth(title, 28) + (hasIcon ? 40 : 0) : 0
	const horizontalGap = 24
	const canShareRow =
		!!title &&
		hasLegend &&
		legendRows === 1 &&
		totalLegendWidth > 0 &&
		titleWidth + horizontalGap + totalLegendWidth <= availableWidth

	const legendTop =
		BASE_TOP_PADDING +
		(canShareRow ? Math.max(0, (titleHeight - singleRowHeight) / 2) : title ? titleHeight + verticalGap : 0)
	const gridTop =
		BASE_TOP_PADDING +
		(canShareRow
			? Math.max(titleHeight, legendHeight) + verticalGap
			: (title ? titleHeight + verticalGap : 0) +
				(hasLegend ? legendHeight + verticalGap + (expandLegend ? 16 : 0) : 0))

	return { gridTop, legendTop, canShareRow, hasLegend, legendRows, totalLegendWidth }
}

// --- Series adjustments for export ---

function adjustSeriesForExport(opts: {
	series: any[]
	flags: SeriesFlags
	layout: ExportLayout
	isDark: boolean
	title: string | undefined
	expandLegend: boolean | undefined
	pngProfile?: PngExportProfile
	exportHeight?: number
	treemapViewportState?: TreemapViewportExportState | null
}): any[] {
	const { flags, layout, isDark, title, expandLegend, exportHeight, treemapViewportState } = opts
	let series = [...opts.series]

	// Scatter: strip image:// symbols and scale labels for export
	series = series.map((s) => {
		if (s?.type !== 'scatter') return s
		const next = { ...s }
		if (Array.isArray(s.data)) {
			next.data = s.data.map((point: any) => {
				if (point && typeof point === 'object' && !Array.isArray(point)) {
					const p = { ...point }
					if (typeof p.symbol === 'string' && p.symbol.startsWith('image://')) {
						delete p.symbol
						p.symbolSize = typeof p.symbolSize === 'number' ? Math.min(p.symbolSize, 12) : 10
					}
					return p
				}
				return point
			})
		}
		if (typeof next.symbol === 'string' && next.symbol.startsWith('image://')) {
			delete next.symbol
			next.symbolSize = typeof next.symbolSize === 'number' ? Math.min(next.symbolSize, 12) : 10
		}
		if (next.label) {
			const labelFontSize = typeof next.label.fontSize === 'number' ? next.label.fontSize : 10
			next.label = { ...next.label, fontSize: Math.round(labelFontSize * 2) }
		}
		return next
	})

	// MarkLine: scale labels and line widths for the larger export canvas
	series = series.map((s) => {
		if (!s?.markLine) return s
		const next = { ...s }
		const ml = { ...s.markLine }
		if (ml.label) {
			ml.label = { ...ml.label, fontSize: EXPORT_FONT_SIZE }
		}
		if (ml.lineStyle) {
			ml.lineStyle = { ...ml.lineStyle, width: Math.max(2, Number(ml.lineStyle.width ?? 1) * 2) }
		}
		if (Array.isArray(ml.data)) {
			ml.data = ml.data.map((segment: any) => {
				if (!Array.isArray(segment)) return segment
				return segment.map((point: any) => {
					if (!point || typeof point !== 'object') return point
					const p = { ...point }
					if (p.label) {
						p.label = { ...p.label, fontSize: EXPORT_FONT_SIZE }
					}
					if (p.emphasis?.label) {
						p.emphasis = { ...p.emphasis, label: { ...p.emphasis.label, fontSize: EXPORT_FONT_SIZE } }
					}
					if (typeof p.y === 'number') {
						p.y = Math.max(p.y * 2, layout.gridTop + 8)
					}
					return p
				})
			})
		}
		next.markLine = ml
		return next
	})

	// Sankey: scale labels and increase spacing for readability
	if (flags.isSankeyChart) {
		series = series.map((s) => {
			if (s.type !== 'sankey') return s
			return {
				...s,
				top: title ? 60 : 30,
				label: {
					...(s.label ?? {}),
					fontSize: 18,
					rich: {
						name: {
							fontSize: 18,
							fontWeight: 'normal',
							color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
						},
						desc: {
							fontSize: 12,
							color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
						}
					}
				},
				nodeGap: 28,
				nodeWidth: 20
			}
		})
	}

	// HBar: scale bar widths to fill the fixed 720px canvas
	if (flags.isHorizontalBarChart) {
		const categoryCount = Array.isArray(flags.yAxisConfig?.data) ? flags.yAxisConfig.data.length : 0
		const bottomPadding = expandLegend ? 32 : 16
		const plotHeight = Math.max(1, (exportHeight ?? IMAGE_EXPORT_HEIGHT) - layout.gridTop - bottomPadding)
		const bandHeight = categoryCount > 0 ? plotHeight / categoryCount : plotHeight
		const barStacks = new Set(series.filter((s: any) => s?.type === 'bar').map((s: any) => s.stack ?? s.name ?? ''))
		const barSeriesCount = Math.max(1, barStacks.size)
		const barWidth = Math.max(8, Math.min(80, Math.floor((bandHeight * 0.65) / barSeriesCount)))
		series = series.map((s) => (s?.type === 'bar' ? { ...s, barWidth } : s))
	}

	// Pie: recenter for the fixed export canvas and hide labels when legend is shown
	if (flags.isPieChart && layout.hasLegend) {
		series = series.map((s) => {
			if (s?.type !== 'pie') return s
			const existingLabelLayout = s.labelLayout
			const nextLabelLayout =
				typeof existingLabelLayout === 'function'
					? existingLabelLayout
					: { ...(existingLabelLayout ?? {}), hideOverlap: true }
			const left = parsePixelValue(s.left) ?? 0
			const right = parsePixelValue(s.right) ?? 0
			const drawableWidth = Math.max(1, IMAGE_EXPORT_WIDTH - left - right)
			const nextCenterX = Math.round(left + drawableWidth / 2)
			const nextCenterY = Array.isArray(s.center) && s.center.length > 1 ? s.center[1] : '50%'
			return {
				...s,
				center: [nextCenterX, nextCenterY],
				avoidLabelOverlap: true,
				labelLayout: nextLabelLayout,
				label: { ...(s.label ?? {}), show: false },
				labelLine: { ...(s.labelLine ?? {}), show: false }
			}
		})
	}

	// Treemap: push chart body below title area
	if (flags.isTreemapChart) {
		series = series.map((s) => {
			if (s?.type !== 'treemap') return s
			// The cloned export must declare labels at both series and level scope.
			// ECharts treemap levels can override series labels, which previously produced normalized PNGs with no text.
			const total = Array.isArray(s.data)
				? s.data.reduce((sum: number, item: any) => {
						return sum + getTreemapNumericValue(item?.value)
					}, 0)
				: 0
			const sourceLabel = s.label ?? {}
			const exportLabelFormatter = (params: any) => formatTreemapExportLabel(params, total, sourceLabel.formatter)
			const exportLabel = {
				...sourceLabel,
				show: true,
				position: sourceLabel.position ?? 'insideTopLeft',
				padding: sourceLabel.padding ?? [4, 6],
				formatter: exportLabelFormatter,
				rich: {
					name: {
						fontSize: 16,
						fontWeight: 600,
						color: '#fff',
						lineHeight: 22
					},
					value: {
						fontSize: 13,
						color: 'rgba(255,255,255,0.85)',
						lineHeight: 18
					},
					...(sourceLabel.rich ?? {})
				}
			}
			const sourceUpperLabel = s.upperLabel ?? {}
			const exportUpperLabel = {
				...sourceUpperLabel,
				show: sourceUpperLabel.show !== false,
				color: sourceUpperLabel.color ?? (isDark ? '#fff' : '#111'),
				formatter:
					typeof sourceUpperLabel.formatter === 'function'
						? sourceUpperLabel.formatter
						: (params: any) => String(params?.name ?? '')
			}
			const targetDataRoot = getTreemapTargetDataRoot(s, treemapViewportState ?? null)
			const exportData = targetDataRoot?.data ?? s.data
			return {
				...s,
				...(targetDataRoot ? { name: targetDataRoot.name } : {}),
				top: layout.gridTop,
				left: TREEMAP_EXPORT_SIDE_PADDING,
				right: TREEMAP_EXPORT_SIDE_PADDING,
				bottom: TREEMAP_EXPORT_BOTTOM_PADDING,
				breadcrumb: { ...(s?.breadcrumb ?? {}), show: false },
				data: Array.isArray(exportData)
					? applyTreemapDataExportLabels(exportData, exportLabel, exportUpperLabel)
					: exportData,
				label: exportLabel,
				upperLabel: exportUpperLabel,
				levels: Array.isArray(s.levels)
					? s.levels.map((level: any) => {
							const levelLabel = level?.label ?? {}
							const levelUpperLabel = level?.upperLabel ?? {}
							return {
								...level,
								label: {
									...exportLabel,
									...levelLabel,
									show: true,
									formatter: typeof levelLabel.formatter === 'function' ? levelLabel.formatter : exportLabelFormatter
								},
								upperLabel: {
									...exportUpperLabel,
									...levelUpperLabel,
									show: levelUpperLabel.show ?? exportUpperLabel.show,
									formatter:
										typeof levelUpperLabel.formatter === 'function'
											? levelUpperLabel.formatter
											: exportUpperLabel.formatter
								}
							}
						})
					: s.levels
			}
		})
	}

	return series
}

// --- Export title construction ---

function buildExportTitle(opts: {
	title: string | undefined
	iconBase64: string | null
	isDark: boolean
}): Record<string, any> {
	const { title, iconBase64, isDark } = opts
	return {
		text: iconBase64 ? `{icon|} ${title}` : title,
		textStyle: {
			fontSize: 28,
			fontWeight: 600,
			color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
			rich: iconBase64
				? {
						icon: {
							height: 32,
							width: 32,
							verticalAlign: 'middle',
							backgroundColor: { image: iconBase64 }
						}
					}
				: undefined
		},
		left: 14,
		top: BASE_TOP_PADDING,
		z: EXPORT_TITLE_Z
	}
}

// --- Chart render wait ---

function waitForChartRender(chart: echarts.ECharts, timeoutMs = 1500): Promise<void> {
	return new Promise<void>((resolve) => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null
		const handler = () => {
			if (timeoutId) clearTimeout(timeoutId)
			chart.off('rendered', handler)
			resolve()
		}
		timeoutId = setTimeout(() => {
			chart.off('rendered', handler)
			resolve()
		}, timeoutMs)
		chart.on('rendered', handler)
	})
}

// --- Clone export orchestrator ---

async function renderClonedChartExport(
	tempContainer: HTMLDivElement,
	originalChart: echarts.ECharts,
	isDark: boolean,
	title: string | undefined,
	iconUrl: string | undefined,
	expandLegend: boolean | undefined,
	pngProfile?: PngExportProfile
): Promise<string> {
	const { echarts: echartsCore } = await import('./chartExportEcharts')
	const currentOptions = originalChart.getOption()

	const flags = detectSeriesFlags(currentOptions)
	const stashedLogos = readStashedChartLogos(originalChart)
	const treemapViewportState = flags.isTreemapChart ? readTreemapViewportExportState(originalChart) : null
	let exportHeight = IMAGE_EXPORT_HEIGHT
	if (pngProfile === 'hbar' && flags.isHorizontalBarChart) {
		const categoryCount = Array.isArray(flags.yAxisConfig?.data) ? flags.yAxisConfig.data.length : 0
		if (categoryCount > 0) {
			const minBarHeight = 36
			exportHeight = Math.max(IMAGE_EXPORT_HEIGHT, categoryCount * minBarHeight + 120)
		}
	}

	tempContainer.style.height = `${exportHeight}px`

	const tempChart = echartsCore.init(tempContainer, null, {
		width: IMAGE_EXPORT_WIDTH,
		height: exportHeight,
		renderer: 'canvas'
	})

	try {
		const iconBase64 = iconUrl ? await loadCircularIcon(iconUrl) : null

		// Treemap labels rely on local rich-text sizing; a global boost makes them too large.
		if (!flags.isTreemapChart) {
			currentOptions.textStyle = { ...(currentOptions.textStyle ?? {}), fontSize: EXPORT_FONT_SIZE }
		}

		if (currentOptions.xAxis) {
			currentOptions.xAxis = scaleXAxisForExport(currentOptions.xAxis as any[])
		}
		if (currentOptions.yAxis) {
			currentOptions.yAxis = scaleYAxisForExport(currentOptions.yAxis as any[], flags.isHorizontalBarChart)
		}
		if (currentOptions.graphic) {
			currentOptions.graphic = scaleGraphicForExport(currentOptions.graphic as any[])
		}

		const legendItems = collectLegendItems(currentOptions, flags.isPieChart)
		const showLegend = isLegendVisibleForExport(flags, currentOptions)
		const layout = computeExportLayout({
			title,
			legendItems,
			shouldShowLegend: showLegend,
			hasIcon: !!iconBase64,
			expandLegend
		})

		currentOptions.series = adjustSeriesForExport({
			series: (currentOptions.series as any[]) ?? [],
			flags,
			layout,
			isDark,
			title,
			expandLegend,
			pngProfile,
			exportHeight,
			treemapViewportState
		})

		currentOptions.title = buildExportTitle({ title, iconBase64, isDark })
		currentOptions.animation = false

		if (!flags.isSankeyChart) {
			const hasYAxisName = Array.isArray(currentOptions.yAxis) && currentOptions.yAxis.some((a: any) => !!a?.name)
			const hasXAxisName = Array.isArray(currentOptions.xAxis) && currentOptions.xAxis.some((a: any) => !!a?.name)
			const scatterLeftPad = flags.isScatterChart && hasYAxisName ? 48 : 16
			const scatterBottomPad = flags.isScatterChart && hasXAxisName ? 48 : expandLegend ? 32 : 16
			let gridLeft: number = scatterLeftPad
			let gridBottom: number = scatterBottomPad
			let outerBoundsContain: string | undefined = 'axisLabel'
			if (stashedLogos?.kind === 'cartesian-x') {
				gridBottom = scatterBottomPad + EXPORT_CATEGORY_LOGO_SIZE + EXPORT_CATEGORY_LOGO_GAP
				outerBoundsContain = undefined
			} else if (stashedLogos?.kind === 'hbar') {
				gridLeft = computeHBarLeftGridForExport(stashedLogos.categories)
				outerBoundsContain = undefined
			}
			currentOptions.grid = {
				left: gridLeft,
				bottom: gridBottom,
				top: layout.gridTop,
				right: 16,
				outerBoundsMode: 'same',
				outerBoundsContain
			}
		}

		tempChart.setOption(currentOptions)

		if (layout.hasLegend) {
			tempChart.setOption({
				legend: {
					show: true,
					textStyle: {
						fontSize: EXPORT_FONT_SIZE,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					itemHeight: 24,
					itemWidth: 48,
					itemGap: LEGEND_ITEM_GAP,
					top: layout.legendTop,
					right: 16,
					...(expandLegend
						? { type: 'plain', padding: [0, 0, 0, 0], ...(layout.canShareRow ? {} : { left: 16 }) }
						: { type: 'scroll', padding: [0, 0, 0, 18] }),
					pageButtonPosition: 'end'
				}
			})
		}

		await waitForChartRender(tempChart)
		if (treemapViewportState && applyTreemapViewportExportState(tempChart, treemapViewportState)) {
			await waitForChartRender(tempChart)
		}

		if (flags.isTreemapChart) {
			const labelGraphics = buildTreemapExportLabelGraphics(tempChart, isDark)
			if (labelGraphics.length > 0) {
				currentOptions.graphic = [...getGraphicArray(currentOptions.graphic), ...labelGraphics]
				tempChart.setOption({ graphic: currentOptions.graphic })
				await waitForChartRender(tempChart)
			}
		}

		const baseDataURL = await getChartPngDataURL(tempChart, {
			pixelRatio: 2,
			backgroundColor: isDark ? '#0b1214' : '#ffffff',
			excludeComponents: ['toolbox', 'dataZoom']
		})
		const exportDataURL = flags.isTreemapChart
			? await composeTreemapExportFrame({
					baseDataURL,
					title,
					iconBase64,
					isDark,
					topInset: layout.gridTop,
					exportHeight
				})
			: baseDataURL

		if (!stashedLogos) {
			return exportDataURL
		}

		try {
			return await composeLogoOverlay({
				baseDataURL: exportDataURL,
				tempChart,
				logosData: stashedLogos,
				isDark,
				gridBottom: Number((currentOptions.grid as any)?.bottom ?? 16),
				chartCssWidth: IMAGE_EXPORT_WIDTH,
				chartCssHeight: exportHeight
			})
		} catch (error) {
			console.log('Failed to compose logo overlay:', error)
			return exportDataURL
		}
	} finally {
		tempChart.dispose()
	}
}

// --- Component ---
// --- Public API ---

export interface ExportChartAsPngOptions {
	isDark: boolean
	title?: string
	iconUrl?: string
	expandLegend?: boolean
	pngProfile?: PngExportProfile
}

/**
 * Export an ECharts instance as a PNG data URL at 1280×720 with title, icon,
 * legend, and axis scaling optimized for export. Returns null on failure.
 */
export async function exportChartAsPng(chart: echarts.ECharts, opts: ExportChartAsPngOptions): Promise<string | null> {
	const { isDark, title, iconUrl, expandLegend, pngProfile = 'default' } = opts

	const tempContainer = document.createElement('div')
	tempContainer.style.cssText = `width:${IMAGE_EXPORT_WIDTH}px;height:${IMAGE_EXPORT_HEIGHT}px;position:absolute;left:-99999px;top:0;`
	document.body.appendChild(tempContainer)

	try {
		const dataURL = await renderClonedChartExport(
			tempContainer,
			chart,
			isDark,
			title,
			iconUrl,
			expandLegend,
			pngProfile
		)
		return dataURL
	} catch (error) {
		console.log('Error exporting chart image:', error)
		return null
	} finally {
		if (tempContainer.parentNode) {
			tempContainer.parentNode.removeChild(tempContainer)
		}
	}
}
