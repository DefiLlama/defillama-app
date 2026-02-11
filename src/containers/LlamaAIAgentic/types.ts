export interface ChartConfiguration {
	id: string
	datasetName?: string
	type: 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'hbar'
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
		type: 'line' | 'area' | 'bar' | 'hbar'
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

export interface Message {
	role: 'user' | 'assistant'
	content?: string
	charts?: Array<{ charts: ChartConfiguration[]; chartData: Record<string, any[]> }>
	citations?: string[]
	images?: Array<{ url: string; mimeType: string; filename?: string }>
	id?: string
	timestamp?: number
}
