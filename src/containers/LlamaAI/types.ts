// Chart-related types from backend
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
		type: 'line' | 'area' | 'bar' | 'hbar' | 'candlestick'
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

export interface UploadedImage {
	id: string
	url: string
	mimeType: string
	filename?: string
	size: number
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

export interface EntityQuestionsResponse {
	questions: string[]
	suggestGlobal: boolean
	entityNotFound?: boolean
	metadata?: {
		entitySlug: string
		entityType: 'protocol' | 'chain'
		generatedAt: string
	}
}

// ============================================
// Stream Item Types (Items-Only Architecture)
// ============================================

export interface MarkdownItem {
	type: 'markdown'
	id: string
	text: string
	citations?: string[]
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

export interface ImagesItem {
	type: 'images'
	id: string
	images: UploadedImage[]
}

export interface LoadingItem {
	type: 'loading'
	id: string
	stage: string
	message?: string
}

export interface ResearchItem {
	type: 'research'
	id: string
	isActive: boolean
	startTime: number
	currentIteration: number
	totalIterations: number
	phase: 'planning' | 'fetching' | 'analyzing' | 'synthesizing'
	dimensionsCovered: string[]
	dimensionsPending: string[]
	discoveries: string[]
	toolsExecuted: number
}

export interface ErrorItem {
	type: 'error'
	id: string
	message: string
	code?: string
	recoverable?: boolean
}

export interface Suggestion {
	label: string
	action?: string
	params?: Record<string, any>
}

export interface SuggestionsItem {
	type: 'suggestions'
	id: string
	suggestions: Suggestion[]
}

export interface MetadataItem {
	type: 'metadata'
	id: string
	metadata: any
}

export type StreamItem =
	| MarkdownItem
	| ChartItem
	| CsvItem
	| ImagesItem
	| LoadingItem
	| ResearchItem
	| ErrorItem
	| SuggestionsItem
	| MetadataItem

// Type guards for stream items
export function isMarkdownItem(item: StreamItem): item is MarkdownItem {
	return item.type === 'markdown'
}

export function isChartItem(item: StreamItem): item is ChartItem {
	return item.type === 'chart'
}

export function isCsvItem(item: StreamItem): item is CsvItem {
	return item.type === 'csv'
}

export function isArtifactItem(item: StreamItem): item is ChartItem | CsvItem {
	return item.type === 'chart' || item.type === 'csv'
}

export function isRenderableItem(item: StreamItem): boolean {
	return item.type !== 'metadata'
}

// Message format with items
export interface Message {
	id: string
	role: 'user' | 'assistant'
	content?: string // For user messages
	items?: StreamItem[] // For assistant messages
	images?: UploadedImage[] // User-uploaded images (part of question)
	timestamp: number
}
