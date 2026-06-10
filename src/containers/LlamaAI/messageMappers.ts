import type { CsvExport, MdExport } from '~/containers/LlamaAI/fetchAgenticResponse'
import type {
	ChartConfiguration,
	ChartDataByKey,
	DashboardArtifact,
	DashboardItem,
	FactCheckReference,
	Message,
	TodoItem,
	ToolExecution,
	UnifiedCitationReference
} from '~/containers/LlamaAI/types'
import { buildRestoredAlerts, type RestoredAlertMetadata } from '~/containers/LlamaAI/utils/restoredAlerts'
import { normalizeChartConfigs, normalizeChartDataByKey, normalizeDashboardItems } from './chartPayloads'

export interface PersistedToolExecution extends Partial<ToolExecution> {
	toolName?: string
}

export interface PersistedMessageMetadata extends RestoredAlertMetadata {
	toolExecutions?: PersistedToolExecution[]
	thinking?: string
	quotedText?: string
	dashboardConfig?: {
		dashboardName?: string
		items?: unknown
		timePeriod?: string
		sourceDashboardId?: string
	}
	deliveryChannel?: 'email' | 'telegram' | 'slack'
	mdExports?: Array<{ id: string; title: string; url: string; filename: string }>
	x402_cost_usd?: string
	factCheck?: {
		references?: unknown[]
	}
	citations?: { schemaVersion?: number; citations?: unknown[] }
}

export interface PersistedMessage {
	role: 'user' | 'assistant'
	content?: string
	charts?: unknown
	chartData?: unknown
	citations?: string[]
	csvExports?: CsvExport[]
	mdExports?: MdExport[]
	images?: Array<{
		url: string
		mimeType: string
		filename?: string
		originalFilename?: string
		textContent?: string
		size?: number
	}>
	generatedImages?: Array<{ id?: string; url: string; size?: string; prompt?: string; revised_prompt?: string }>
	metadata?: PersistedMessageMetadata
	messageMetadata?: Message['messageMetadata']
	messageId?: string
	parentId?: string
	siblingInfo?: Message['siblingInfo']
	timestamp?: string | number
	savedAlertIds?: string[]
}

export interface SharedSession {
	session: { sessionId: string; title: string; createdAt: string; isPublic: boolean }
	messages: SharedSessionMessage[]
	activeLeafMessageId?: string
	isPublicView: true
}

export interface SharedSessionMessage {
	role: 'user' | 'assistant'
	content: string
	messageId?: string
	timestamp: number
	quotedText?: string
	images?: Array<{
		url: string
		mimeType: string
		filename?: string
		originalFilename?: string
		textContent?: string
		size?: number
	}>
	generatedImages?: Array<{ id?: string; url: string; size?: string; prompt?: string; revised_prompt?: string }>
	metadata?: PersistedMessageMetadata
	charts?: unknown
	chartData?: unknown[] | ChartDataByKey
	citations?: string[]
	csvExports?: CsvExport[]
	mdExports?: MdExport[]
	savedAlertIds?: string[]
}

export interface SessionRestoreResult {
	messages?: PersistedMessage[]
	todos?: TodoItem[]
	activeLeafMessageId?: string
	pagination?: { hasMore?: boolean; cursor?: number | null; hasNewer?: boolean; newerCursor?: number | null }
	projectId?: string | null
}

const mapPersistedTimestamp = (timestamp: PersistedMessage['timestamp']): number | undefined => {
	if (timestamp === undefined) return undefined
	const value = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
	return Number.isFinite(value) ? value : undefined
}

function mapToolExecution(tool: PersistedToolExecution): ToolExecution {
	return {
		...tool,
		name: tool.name || tool.toolName || 'unknown',
		executionTimeMs: typeof tool.executionTimeMs === 'number' ? tool.executionTimeMs : 0,
		success: tool.success === true
	}
}

function stableHash(value: string): string {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0).toString(36)
}

function hasChartData(chartData: ChartDataByKey): boolean {
	for (const key in chartData) {
		if (chartData[key]?.length) return true
	}
	return false
}

function getRestoredDashboardIdSuffix(message: PersistedMessage, index?: number): string {
	if (message.messageId) return message.messageId
	const dashboardConfig = message.metadata?.dashboardConfig
	return `fallback_${stableHash(
		[
			message.role,
			message.content ?? '',
			message.timestamp ?? '',
			message.parentId ?? '',
			dashboardConfig?.dashboardName ?? '',
			dashboardConfig?.sourceDashboardId ?? '',
			Array.isArray(dashboardConfig?.items) ? dashboardConfig.items.length : 0,
			index ?? ''
		].join('\u001f')
	)}`
}

function buildRestoredDashboard(message: PersistedMessage, index?: number): DashboardArtifact | null {
	const dashboardConfig = message.metadata?.dashboardConfig
	if (!dashboardConfig) return null
	const items = normalizeDashboardItems(dashboardConfig.items)
	const charts = normalizeChartConfigs(message.charts)
	const chartData = normalizeChartDataByKey(message.chartData, charts)

	// Historical persisted messages may not have a dashboard id, but the render
	// model still needs a stable artifact key for fallback rendering.
	const restoredDashboardIdSuffix = getRestoredDashboardIdSuffix(message, index)
	const artifact: DashboardArtifact = {
		id: `dashboard_restored_${restoredDashboardIdSuffix}`,
		dashboardName: dashboardConfig.dashboardName || 'Dashboard',
		items,
		timePeriod: dashboardConfig.timePeriod,
		sourceDashboardId: dashboardConfig.sourceDashboardId
	}
	const chartRefs = items.filter(
		(item): item is Extract<DashboardItem, { kind: 'llamaai-chart' }> & { chartRef: string } =>
			item.kind === 'llamaai-chart' && typeof item.chartRef === 'string'
	)
	if (chartRefs.length > 0 && charts.length > 0) {
		const chartConfigMap = new Map(charts.map((chart) => [chart.id, chart]))
		const bundled: NonNullable<DashboardArtifact['chartData']> = {}
		for (const item of chartRefs) {
			const config = chartConfigMap.get(item.chartRef)
			const data = chartData[item.chartRef] || (config?.datasetName ? chartData[config.datasetName] : undefined)
			if (data && config) {
				bundled[item.chartRef] = { config, data, toolChain: [] }
			}
		}
		if (Object.keys(bundled).length > 0) artifact.chartData = bundled
	}

	return artifact
}

function normalizeLegacyFactCheckRefs(refs: unknown): UnifiedCitationReference[] {
	if (!Array.isArray(refs)) return []
	return refs
		.filter((r): r is FactCheckReference => !!r && typeof r === 'object')
		.map((r, i) => ({
			...r,
			id: typeof r.id === 'number' ? r.id : i + 1,
			sourceType: canonicalizeLegacyCitationSourceType(r.sourceType, r.url),
			label: r.label?.trim() ? r.label : 'Source'
		}))
		.filter((r) => r.label !== '')
}

function canonicalizeLegacyCitationSourceType(
	sourceType: string | undefined,
	url: string | undefined
): UnifiedCitationReference['sourceType'] {
	if (!sourceType) return url ? 'web' : 'data'

	if (/tweet|twitter|x_/i.test(sourceType) || sourceType.toLowerCase() === 'x') return 'x'
	if (/web|url|article|news|http/i.test(sourceType)) return 'web'
	if (/sql|warehouse|defillama|data/i.test(sourceType)) return 'data'
	if (/code|computed/i.test(sourceType)) return 'computed'

	return sourceType
}

function resolveCitationFields(metadata: PersistedMessageMetadata | undefined, urlCitations: string[] | undefined) {
	const envelopeCitations =
		Array.isArray(metadata?.citations?.citations) && metadata.citations.citations.length > 0
			? (metadata.citations.citations as UnifiedCitationReference[])
			: undefined
	const legacyFactCheck =
		!envelopeCitations && Array.isArray(metadata?.factCheck?.references) && metadata.factCheck.references.length > 0
			? normalizeLegacyFactCheckRefs(metadata.factCheck.references)
			: undefined
	const citations = envelopeCitations ?? (legacyFactCheck && legacyFactCheck.length > 0 ? legacyFactCheck : undefined)
	const legacyUrlCitations =
		!citations && Array.isArray(urlCitations) && urlCitations.length > 0 ? urlCitations : undefined
	return { citations, legacyUrlCitations }
}

export function mapPersistedMessage(message: PersistedMessage, index?: number): Message {
	const restoredDashboard = buildRestoredDashboard(message, index)
	const charts = normalizeChartConfigs(message.charts)
	const chartData = normalizeChartDataByKey(message.chartData, charts)
	const { citations, legacyUrlCitations } = resolveCitationFields(message.metadata, message.citations)
	return {
		role: message.role,
		content: message.content,
		charts: charts.length > 0 && hasChartData(chartData) ? [{ charts, chartData }] : undefined,
		citations,
		legacyUrlCitations,
		csvExports: message.csvExports,
		mdExports: message.mdExports ?? message.metadata?.mdExports,
		dashboards: restoredDashboard ? [restoredDashboard] : undefined,
		alerts: buildRestoredAlerts({
			content: message.content,
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		generatedImages: message.generatedImages,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		quotedText: message.metadata?.quotedText,
		messageMetadata: message.messageMetadata,
		id: message.messageId ?? (index != null ? `persisted-${index}` : undefined),
		parentId: message.parentId,
		siblingInfo: message.siblingInfo,
		timestamp: mapPersistedTimestamp(message.timestamp)
	}
}

export function mapPersistedMessages(messages: PersistedMessage[] | undefined): Message[] {
	if (!messages || messages.length === 0) return []
	return messages.map((msg, i) => mapPersistedMessage(msg, i))
}

export function normalizeSharedChartDataByChartId(
	charts: ChartConfiguration[] | undefined,
	chartData: SharedSessionMessage['chartData']
): ChartDataByKey | undefined {
	if (!charts || charts.length === 0 || !chartData) return undefined
	return normalizeChartDataByKey(chartData, charts)
}

export function mapSharedSessionMessage(message: SharedSessionMessage, index?: number): Message {
	const charts = normalizeChartConfigs(message.charts)
	const chartData = normalizeSharedChartDataByChartId(charts, message.chartData)
	const { citations, legacyUrlCitations } = resolveCitationFields(message.metadata, message.citations)
	return {
		role: message.role,
		content: message.content || undefined,
		charts: charts.length > 0 && chartData && hasChartData(chartData) ? [{ charts, chartData }] : undefined,
		csvExports: message.csvExports,
		mdExports: message.mdExports ?? message.metadata?.mdExports,
		citations,
		legacyUrlCitations,
		alerts: buildRestoredAlerts({
			content: message.content,
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		generatedImages: message.generatedImages,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		quotedText: message.quotedText ?? message.metadata?.quotedText,
		id: message.messageId ?? (index != null ? `shared-${index}` : undefined),
		timestamp: mapPersistedTimestamp(message.timestamp)
	}
}
