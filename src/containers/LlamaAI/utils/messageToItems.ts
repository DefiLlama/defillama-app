import type {
	StreamItem,
	MarkdownItem,
	ChartItem,
	CsvItem,
	ImagesItem,
	MetadataItem,
	SuggestionsItem,
	ChartConfiguration,
	UploadedImage
} from '../types'

/**
 * Response fields that can be converted to items.
 * These are the fields on an assistant message that contain renderable content.
 */
interface ResponseFields {
	content?: string
	charts?: ChartConfiguration[]
	chartData?: any[] | Record<string, any[]>
	citations?: string[]
	csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
	images?: UploadedImage[]
	suggestions?: any[]
	metadata?: any
	inlineSuggestions?: string
}

/**
 * Converts assistant message response fields to the items-based format.
 * Used when messages have content/charts/etc but not pre-computed items.
 *
 * @param response - Response fields from an assistant message
 * @param messageId - Message ID for generating item IDs
 * @returns Array of StreamItem objects
 */
export function responseToItems(response: ResponseFields, messageId?: string): StreamItem[] {
	const items: StreamItem[] = []
	const id = messageId || 'unknown'

	// Main markdown content with citations
	if (response.content) {
		const markdownItem: MarkdownItem = {
			type: 'markdown',
			id: `${id}-markdown`,
			text: response.content,
			citations: response.citations
		}
		items.push(markdownItem)
	}

	// Charts
	if (response.charts?.length) {
		response.charts.forEach((chart: ChartConfiguration, index: number) => {
			const chartItem: ChartItem = {
				type: 'chart',
				id: chart.id || `${id}-chart-${index}`,
				chart,
				chartData: getChartData(response.chartData, chart.id)
			}
			items.push(chartItem)
		})
	}

	// CSV exports
	if (response.csvExports?.length) {
		response.csvExports.forEach((csv) => {
			const csvItem: CsvItem = {
				type: 'csv',
				id: csv.id,
				title: csv.title,
				url: csv.url,
				rowCount: csv.rowCount,
				filename: csv.filename
			}
			items.push(csvItem)
		})
	}

	// Response images
	if (response.images?.length) {
		const imagesItem: ImagesItem = {
			type: 'images',
			id: `${id}-images`,
			images: response.images
		}
		items.push(imagesItem)
	}

	// Inline suggestions (follow-up question text) - rendered as markdown
	if (response.inlineSuggestions) {
		const inlineSuggestionsItem: MarkdownItem = {
			type: 'markdown',
			id: `${id}-inline-suggestions`,
			text: response.inlineSuggestions
		}
		items.push(inlineSuggestionsItem)
	}

	// Suggestions - normalize various backend formats to { label, action?, params? }
	if (response.suggestions?.length) {
		const suggestionsItem: SuggestionsItem = {
			type: 'suggestions',
			id: `${id}-suggestions`,
			suggestions: response.suggestions.map((s: any) => {
				if (typeof s === 'string') return { label: s }
				return {
					label: s.label || s.title || s.text || '',
					action: s.action || s.toolName || s.description,
					params: s.params || s.arguments
				}
			})
		}
		items.push(suggestionsItem)
	}

	// Metadata
	if (response.metadata) {
		const metadataItem: MetadataItem = {
			type: 'metadata',
			id: `${id}-metadata`,
			metadata: response.metadata
		}
		items.push(metadataItem)
	}

	return items
}

/**
 * Gets chart data for a specific chart ID.
 * Handles both array format (shared data) and keyed object format (per-chart data).
 */
function getChartData(
	chartData: any[] | Record<string, any[]> | undefined,
	chartId: string
): any[] | Record<string, any[]> {
	if (!chartData) {
		return []
	}

	// If it's an array, return as-is (shared data for all charts)
	if (Array.isArray(chartData)) {
		return chartData
	}

	// If it's a keyed object, try to get data for this specific chart
	if (typeof chartData === 'object') {
		return chartData[chartId] || chartData
	}

	return []
}
