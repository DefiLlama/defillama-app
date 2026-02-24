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

export interface AlertProposedData {
	alertId: string
	title: string
	alertIntent: {
		frequency: 'daily' | 'weekly'
		hour: number
		timezone: string
		dayOfWeek?: number
	}
	schedule_expression: string
	next_run_at: string
}

export interface ToolExecution {
	name: string
	executionTimeMs: number
	success: boolean
	error?: string
	resultPreview?: any[]
	resultCount?: number
	resultId?: string
	sqlQuery?: string
	toolData?: Record<string, any>
}

export interface Message {
	role: 'user' | 'assistant'
	content?: string
	charts?: Array<{ charts: ChartConfiguration[]; chartData: Record<string, any[]> }>
	csvExports?: CsvExport[]
	citations?: string[]
	alerts?: AlertProposedData[]
	savedAlertIds?: string[]
	images?: Array<{ url: string; mimeType: string; filename?: string }>
	id?: string
	timestamp?: number
	toolExecutions?: ToolExecution[]
	thinking?: string
}
