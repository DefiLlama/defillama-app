import type { AlertProposedData, ChartConfiguration, Message } from '~/containers/LlamaAI/types'
import { parseArtifactPlaceholders } from '~/containers/LlamaAI/utils/markdownHelpers'

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

export type ArtifactRecord = ChartArtifactRecord | CsvArtifactRecord | AlertArtifactRecord

export type ArtifactRegistry = Map<string, ArtifactRecord>

export type MessageRenderBlock =
	| { type: 'markdown'; key: string; content: string; citations?: string[] }
	| { type: 'sources'; key: string; citations: string[] }
	| { type: 'chart'; key: string; artifactId: string }
	| { type: 'csv'; key: string; artifactId: string }
	| { type: 'alert'; key: string; artifactId: string }
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

		if (part.type === 'alert') {
			if (usedArtifactIds.has(part.alertId)) continue
			usedArtifactIds.add(part.alertId)
			blocks.push({
				type: 'alert',
				key: `alert-${part.alertId}-${blocks.length}`,
				artifactId: part.alertId
			})
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
