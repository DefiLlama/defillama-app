// Chart-related types from backend
export interface ChartConfiguration {
	id: string
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

// Alert-related types for scheduled data delivery
export interface AlertIntent {
	detected: boolean
	frequency: 'daily' | 'weekly'
	hour: number
	timezone: string
	dayOfWeek?: number
	toolExecutions: Array<{
		toolName: string
		arguments: Record<string, any>
		sqlQuery: string | null
	}>
}

export interface AlertConfig {
	frequency: 'daily' | 'weekly'
	hour: number
	timezone: string
	dayOfWeek?: number
}
