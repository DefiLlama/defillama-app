import type {
	AlertProposedData,
	ChartConfiguration,
	DashboardArtifact,
	GeneratedImage,
	Message
} from '~/containers/LlamaAI/types'
import { parseArtifactPlaceholders } from '~/containers/LlamaAI/utils/markdownHelpers'

/**
 * Whether a message has rendered chart artifacts. Used to gate features
 * (e.g. the HTML artifact export button) that don't make sense for a
 * brief chat reply. Charts are a server-emitted artifact, so this is a
 * deterministic signal — not a content heuristic.
 */
export function messageHasCharts(message: Message | null | undefined): boolean {
	return (message?.charts?.length ?? 0) > 0
}

export type ChartArtifactRecord = {
	type: 'chart'
	id: string
	charts: ChartConfiguration[]
	chartData: Record<string, any[]>
}

export type CsvArtifactRecord = {
	type: 'csv'
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

export type AlertArtifactRecord = {
	type: 'alert'
	id: string
	title: string
	alert: AlertProposedData
	messageId?: string
	savedAlertIds?: string[]
}

export type MdArtifactRecord = {
	type: 'md'
	id: string
	title: string
	url: string
	filename: string
}

export type DashboardArtifactRecord = {
	type: 'dashboard'
	id: string
	dashboard: DashboardArtifact
}

export type ImageArtifactRecord = {
	type: 'image'
	id: string
	image: GeneratedImage
}

export type ArtifactRecord =
	| ChartArtifactRecord
	| CsvArtifactRecord
	| MdArtifactRecord
	| AlertArtifactRecord
	| DashboardArtifactRecord
	| ImageArtifactRecord

export type ArtifactRegistry = Map<string, ArtifactRecord>

export type MessageRenderBlock =
	| { type: 'markdown'; key: string; content: string; citations?: string[] }
	| { type: 'sources'; key: string; citations: string[] }
	| { type: 'chart'; key: string; artifactId: string }
	| { type: 'csv'; key: string; artifactId: string }
	| { type: 'md'; key: string; artifactId: string }
	| { type: 'alert'; key: string; artifactId: string }
	| { type: 'dashboard'; key: string; artifactId: string }
	| { type: 'image'; key: string; artifactId: string }
	| { type: 'action-group'; key: string; actions: Array<{ label: string; message: string }> }

type ParsedRenderModel = {
	artifactsById: ArtifactRegistry
	blocks: MessageRenderBlock[]
}

function buildArtifactRegistry(message: Message): ArtifactRegistry {
	const artifacts: ArtifactRegistry = new Map()

	// Flatten message-level artifacts into one lookup so render blocks only carry stable ids.
	for (const set of message.charts ?? []) {
		for (const chart of set.charts) {
			artifacts.set(chart.id, {
				type: 'chart',
				id: chart.id,
				charts: [chart],
				chartData: set.chartData
			})
		}
	}

	for (const csv of message.csvExports ?? []) {
		artifacts.set(csv.id, {
			type: 'csv',
			id: csv.id,
			title: csv.title,
			url: csv.url,
			rowCount: csv.rowCount,
			filename: csv.filename
		})
	}

	for (const md of message.mdExports ?? []) {
		artifacts.set(md.id, {
			type: 'md',
			id: md.id,
			title: md.title,
			url: md.url,
			filename: md.filename
		})
	}

	for (const alert of message.alerts ?? []) {
		artifacts.set(alert.alertId, {
			type: 'alert',
			id: alert.alertId,
			title: alert.title,
			alert,
			messageId: message.id,
			savedAlertIds: message.savedAlertIds
		})
	}

	if (message.dashboards) {
		for (const dashboard of message.dashboards) {
			artifacts.set(dashboard.id, { type: 'dashboard', id: dashboard.id, dashboard })
		}
	}

	if (message.generatedImages) {
		for (const image of message.generatedImages) {
			// Fall back to the URL when the server didn't supply an id so the fallback renderer still surfaces the image.
			const id = image.id ?? image.url
			if (!id) continue
			artifacts.set(id, { type: 'image', id, image })
		}
	}

	return artifacts
}

export function parseMessageToRenderModel(message: Message): ParsedRenderModel
export function parseMessageToRenderModel(
	message: Message,
	options: { includeFallbackArtifacts?: boolean }
): ParsedRenderModel
export function parseMessageToRenderModel(
	message: Message,
	options: { includeFallbackArtifacts?: boolean } = {}
): ParsedRenderModel {
	const artifactsById = buildArtifactRegistry(message)
	const parsed = parseArtifactPlaceholders(message.content || '')
	const blocks: MessageRenderBlock[] = []
	const usedArtifactIds = new Set<string>()
	const { includeFallbackArtifacts = true } = options

	let actionGroup: Array<{ label: string; message: string }> = []
	let markdownBlockIndex = 0

	const flushActionGroup = () => {
		if (actionGroup.length === 0) return
		blocks.push({
			type: 'action-group',
			key: `actions-${blocks.length}`,
			actions: actionGroup
		})
		actionGroup = []
	}

	for (let index = 0; index < parsed.parts.length; index++) {
		const part = parsed.parts[index]

		if (part.type === 'action') {
			actionGroup.push({ label: part.actionLabel, message: part.actionMessage })
			continue
		}

		if (
			actionGroup.length > 0 &&
			part.type === 'text' &&
			!part.content.trim() &&
			parsed.parts.slice(index + 1).some((nextPart) => nextPart.type === 'action')
		) {
			continue
		}

		flushActionGroup()

		if (part.type === 'text') {
			if (!part.content) continue
			blocks.push({
				type: 'markdown',
				key: `markdown-${markdownBlockIndex++}`,
				content: part.content,
				citations: message.citations
			})
			continue
		}

		if (part.type === 'chart') {
			if (usedArtifactIds.has(part.chartId)) continue
			usedArtifactIds.add(part.chartId)
			blocks.push({
				type: 'chart',
				key: `chart-${part.chartId}-${blocks.length}`,
				artifactId: part.chartId
			})
			continue
		}

		if (part.type === 'csv') {
			if (usedArtifactIds.has(part.csvId)) continue
			usedArtifactIds.add(part.csvId)
			blocks.push({
				type: 'csv',
				key: `csv-${part.csvId}-${blocks.length}`,
				artifactId: part.csvId
			})
			continue
		}

		if (part.type === 'md') {
			if (usedArtifactIds.has(part.mdId)) continue
			usedArtifactIds.add(part.mdId)
			blocks.push({
				type: 'md',
				key: `md-${part.mdId}-${blocks.length}`,
				artifactId: part.mdId
			})
			continue
		}

		if (part.type === 'alert') {
			if (usedArtifactIds.has(part.alertId)) continue
			usedArtifactIds.add(part.alertId)
			blocks.push({
				type: 'alert',
				key: `alert-${part.alertId}-${blocks.length}`,
				artifactId: part.alertId
			})
			continue
		}

		if (part.type === 'dashboard') {
			if (usedArtifactIds.has(part.dashboardId)) continue
			usedArtifactIds.add(part.dashboardId)
			blocks.push({
				type: 'dashboard',
				key: `dashboard-${part.dashboardId}-${blocks.length}`,
				artifactId: part.dashboardId
			})
			continue
		}

		if (part.type === 'image') {
			if (usedArtifactIds.has(part.imageId)) continue
			usedArtifactIds.add(part.imageId)
			blocks.push({
				type: 'image',
				key: `image-${part.imageId}-${blocks.length}`,
				artifactId: part.imageId
			})
			continue
		}
	}

	flushActionGroup()

	const citations = message.citations ?? []
	let lastMarkdownIndex = -1
	for (let index = blocks.length - 1; index >= 0; index--) {
		if (blocks[index]?.type === 'markdown') {
			lastMarkdownIndex = index
			break
		}
	}

	if (citations.length > 0) {
		if (lastMarkdownIndex >= 0) {
			blocks.splice(lastMarkdownIndex + 1, 0, {
				type: 'sources',
				key: `sources-${blocks.length}`,
				citations
			})
		}
	}

	if (includeFallbackArtifacts) {
		// Preserve current behavior for artifacts emitted out-of-band without an inline placeholder.
		for (const [artifactId, artifact] of artifactsById) {
			if (usedArtifactIds.has(artifactId)) continue
			if (artifact.type === 'chart') {
				blocks.push({ type: 'chart', key: `chart-${artifactId}-fallback`, artifactId })
				continue
			}
			if (artifact.type === 'csv') {
				blocks.push({ type: 'csv', key: `csv-${artifactId}-fallback`, artifactId })
				continue
			}
			if (artifact.type === 'md') {
				blocks.push({ type: 'md', key: `md-${artifactId}-fallback`, artifactId })
				continue
			}
			if (artifact.type === 'dashboard') {
				blocks.push({ type: 'dashboard', key: `dashboard-${artifactId}-fallback`, artifactId })
				continue
			}
			if (artifact.type === 'image') {
				blocks.push({ type: 'image', key: `image-${artifactId}-fallback`, artifactId })
				continue
			}
			blocks.push({ type: 'alert', key: `alert-${artifactId}-fallback`, artifactId })
		}
	}

	if (citations.length > 0 && lastMarkdownIndex === -1) {
		blocks.push({
			type: 'sources',
			key: `sources-${blocks.length}`,
			citations
		})
	}

	return { artifactsById, blocks }
}
