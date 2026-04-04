export interface ChartConfiguration {
	id: string
	datasetName?: string
	type: 'line' | 'area' | 'bar' | 'combo' | 'pie' | 'scatter' | 'hbar' | 'candlestick'
	title: string
	description: string
	valueSymbol?: string

	axes: {
		x: {
			field: string
			label: string
			type: 'time' | 'category' | 'value'
			valueSymbol?: string
		}
		yAxes: Array<{
			id: string
			fields: string[]
			label: string
			position: 'left' | 'right'
			scale?: 'linear' | 'log'
			valueSymbol?: string
		}>
	}

	series: Array<{
		name: string
		type: 'line' | 'area' | 'bar' | 'hbar' | 'scatter' | 'candlestick'
		yAxisId: string
		metricClass: 'flow' | 'stock'
		dataMapping: {
			xField: string
			yField: string
			entityFilter?: { field: string; value: string }
		}
		styling: {
			color?: string
			opacity?: number
		}
	}>

	dataTransformation: {
		groupBy?: string
		timeField: string
		metrics: string[]
	}

	hallmarks?: Array<[number] | [number, string]>

	displayOptions?: {
		canStack: boolean
		canShowPercentage: boolean
		canShowCumulative: boolean
		supportsGrouping: boolean
		defaultStacked?: boolean
		defaultPercentage?: boolean
		showLabels?: boolean
	}
}

export interface CsvExport {
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

export interface ChatSession {
	sessionId: string
	title: string
	createdAt: string
	lastActivity: string
	isActive: boolean
	isPublic?: boolean
	shareToken?: string
	isPinned?: boolean
	pinnedAt?: string
}

export interface ResearchUsage {
	remainingUsage: number
	limit: number
	period: 'lifetime' | 'daily' | 'biweekly' | 'unlimited' | 'blocked'
	resetTime: string | null
}

export interface AlertProposedData {
	alertId: string
	title: string
	alertIntent: {
		frequency: 'daily' | 'weekly'
		hour: number
		timezone: string
		dayOfWeek?: number
		deliveryChannel?: 'email' | 'telegram'
	}
	schedule_expression: string
	next_run_at: string
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export interface JsonObject {
	[key: string]: JsonValue
}

export interface ToolExecution {
	name: string
	executionTimeMs: number
	success: boolean
	error?: string
	resultPreview?: JsonObject[]
	resultCount?: number
	resultId?: string
	sqlQuery?: string
	toolData?: JsonObject
	isPremium?: boolean
	costUsd?: string
}

export interface AlertIntent {
	detected: boolean
	frequency: 'daily' | 'weekly'
	hour: number
	timezone: string
	dayOfWeek?: number
	deliveryChannel?: 'email' | 'telegram'
	toolExecutions: Array<{
		toolName: string
		arguments: JsonObject
		sqlQuery: string | null
	}>
}

export interface SuggestedQuestionsResponse {
	categories: {
		find_alpha: string[]
		analytics: string[]
		speculative_guidance: string[]
		learn: string[]
		research_report: string[]
	}
	metadata: {
		generatedAt: string
		cacheExpiresAt: string
		totalQuestions: number
	}
}

export interface LandingQuestion {
	text: string
	tag: string
}

export interface LandingQuestionsResponse {
	questions: LandingQuestion[]
	metadata?: {
		generatedAt: string
		cacheExpiresAt: string
		totalQuestions: number
	}
}

export interface EntityQuestionsResponse {
	questions: string[]
	suggestGlobal: boolean
	entityNotFound?: boolean
	metadata?: {
		entitySlug: string
		entityType: 'protocol' | 'chain' | 'page'
		generatedAt: string
	}
}

export interface ChartItem {
	type: 'chart'
	id: string
	chart: ChartConfiguration
	chartData: any[] | Record<string, any[]>
}

export interface CsvItem {
	type: 'csv'
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

export interface MessageMetadata {
	inputTokens?: number
	outputTokens?: number
	executionTimeMs?: number
	x402CostUsd?: string
}

export interface Message {
	role: 'user' | 'assistant'
	content?: string
	charts?: Array<{ charts: ChartConfiguration[]; chartData: Record<string, any[]> }>
	csvExports?: CsvExport[]
	citations?: string[]
	alerts?: AlertProposedData[]
	savedAlertIds?: string[]
	images?: Array<{ url: string; mimeType: string; filename?: string; originalFilename?: string }>
	id?: string
	timestamp?: number
	toolExecutions?: ToolExecution[]
	thinking?: string
	quotedText?: string
	messageMetadata?: MessageMetadata
}

export interface ChartSet {
	charts: ChartConfiguration[]
	chartData: Record<string, any[]>
}

export interface ToolCall {
	id: number
	name: string
	label: string
	isPremium?: boolean
}

export interface SpawnAgentStatus {
	id: string
	status: 'started' | 'thinking' | 'tool_call' | 'completed' | 'error'
	tool?: string
	toolCount?: number
	chartCount?: number
	findingsPreview?: string
}
