import type { CsvExport, MdExport } from '~/containers/LlamaAI/fetchAgenticResponse'
import type {
	ChartConfiguration,
	ChartDataByKey,
	DashboardArtifact,
	DashboardItem,
	Message,
	TodoItem,
	ToolExecution
} from '~/containers/LlamaAI/types'
import { buildRestoredAlerts, type RestoredAlertMetadata } from '~/containers/LlamaAI/utils/restoredAlerts'

export interface PersistedToolExecution extends ToolExecution {
	toolName?: string
}

export interface PersistedMessageMetadata extends RestoredAlertMetadata {
	toolExecutions?: PersistedToolExecution[]
	thinking?: string
	quotedText?: string
	dashboardConfig?: {
		dashboardName?: string
		items?: DashboardItem[]
		timePeriod?: string
		sourceDashboardId?: string
	}
	deliveryChannel?: 'email' | 'telegram'
	mdExports?: Array<{ id: string; title: string; url: string; filename: string }>
	x402_cost_usd?: string
}

export interface PersistedMessage {
	role: 'user' | 'assistant'
	content?: string
	charts?: ChartConfiguration[]
	chartData?: ChartDataByKey
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
	charts?: ChartConfiguration[]
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

function mapToolExecution(tool: PersistedToolExecution): ToolExecution {
	return {
		...tool,
		name: tool.name || tool.toolName || 'unknown'
	}
}

function buildRestoredDashboard(message: PersistedMessage): DashboardArtifact | null {
	const dashboardConfig = message.metadata?.dashboardConfig
	if (!dashboardConfig) return null

	// Historical persisted messages may not have a dashboard id, but the render
	// model still needs a stable artifact key for fallback rendering.
	const restoredDashboardIdSuffix =
		message.messageId ??
		(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: `unknown_${Date.now()}_${Math.random().toString(36).slice(2)}`)
	const artifact: DashboardArtifact = {
		id: `dashboard_restored_${restoredDashboardIdSuffix}`,
		dashboardName: dashboardConfig.dashboardName || 'Dashboard',
		items: dashboardConfig.items ?? [],
		timePeriod: dashboardConfig.timePeriod,
		sourceDashboardId: dashboardConfig.sourceDashboardId
	}
	const chartRefs = (dashboardConfig.items ?? []).filter(
		(item): item is Extract<DashboardItem, { kind: 'llamaai-chart' }> & { chartRef: string } =>
			item.kind === 'llamaai-chart' && typeof item.chartRef === 'string'
	)
	if (chartRefs.length > 0 && message.chartData && message.charts) {
		const chartConfigMap = new Map(message.charts.map((chart) => [chart.id, chart]))
		const bundled: NonNullable<DashboardArtifact['chartData']> = {}
		for (const item of chartRefs) {
			const data = message.chartData[item.chartRef]
			const config = chartConfigMap.get(item.chartRef)
			if (data && config) {
				bundled[item.chartRef] = { config, data, toolChain: [] }
			}
		}
		if (Object.keys(bundled).length > 0) artifact.chartData = bundled
	}

	return artifact
}

export function mapPersistedMessage(message: PersistedMessage, index?: number): Message {
	const restoredDashboard = buildRestoredDashboard(message)
	return {
		role: message.role,
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
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
		timestamp: message.timestamp ? new Date(message.timestamp).getTime() : undefined
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
	if (!Array.isArray(chartData)) return chartData

	// Older shared-session payloads stored one flat row array. Attach it to the
	// first chart's dataset key so ChartRenderer can use the normal keyed path.
	const fallbackKey = charts[0]?.datasetName || charts[0]?.id || 'default'
	return {
		[fallbackKey]: chartData
	}
}

export function mapSharedSessionMessage(message: SharedSessionMessage, index?: number): Message {
	return {
		role: message.role,
		content: message.content || undefined,
		charts:
			message.charts && message.chartData
				? [
						{
							charts: message.charts,
							chartData: normalizeSharedChartDataByChartId(message.charts, message.chartData) ?? {}
						}
					]
				: undefined,
		csvExports: message.csvExports,
		mdExports: message.mdExports ?? message.metadata?.mdExports,
		citations: message.citations,
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
		id: message.messageId ?? (index != null ? `shared-${index}` : undefined)
	}
}
