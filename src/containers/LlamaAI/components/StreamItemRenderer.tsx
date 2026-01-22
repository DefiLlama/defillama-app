import { memo } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import type {
	StreamItem,
	MarkdownItem,
	ChartItem,
	CsvItem,
	ImagesItem,
	LoadingItem,
	ResearchItem,
	ErrorItem,
	SuggestionsItem
} from '../types'
import { ChartRenderer } from './ChartRenderer'
import { CSVExportArtifact } from './CSVExportArtifact'
import { MarkdownRenderer } from './MarkdownRenderer'
import { SuggestedActions } from './PromptResponse'
import { ResearchProgress } from './ResearchProgress'

export interface StreamItemRendererProps {
	item: StreamItem
	/** Map of artifact IDs to their items for O(1) lookup in MarkdownRenderer */
	artifactIndex: Map<string, ChartItem | CsvItem>
	/** Whether currently streaming (affects loading states) */
	isStreaming?: boolean
	/** Whether a request is pending */
	isPending?: boolean
	/** Handler for suggestion clicks */
	onSuggestionClick?: (suggestion: any) => void
	/** Handler for retry button */
	onRetry?: () => void
	/** Whether retry is allowed */
	canRetry?: boolean
	/** Chart resize trigger */
	resizeTrigger?: number
	/** Message ID for chart saving */
	messageId?: string
	/** IDs of charts that can be saved */
	saveableChartIds?: string[]
	/** IDs of charts already saved */
	savedChartIds?: string[]
	/** Progress message for loading states */
	progressMessage?: string
}

/**
 * Renders a single stream item based on its type.
 * This is the core rendering component for the items-based architecture.
 */
export const StreamItemRenderer = memo(function StreamItemRenderer({
	item,
	artifactIndex,
	isStreaming = false,
	isPending = false,
	onSuggestionClick,
	onRetry,
	canRetry,
	resizeTrigger,
	messageId,
	saveableChartIds,
	savedChartIds,
	progressMessage
}: StreamItemRendererProps) {
	switch (item.type) {
		case 'markdown':
			return (
				<MarkdownItemRenderer
					item={item}
					artifactIndex={artifactIndex}
					isStreaming={isStreaming}
					resizeTrigger={resizeTrigger}
					messageId={messageId}
					saveableChartIds={saveableChartIds}
					savedChartIds={savedChartIds}
				/>
			)

		case 'chart':
			return <ChartItemRenderer item={item} resizeTrigger={resizeTrigger} messageId={messageId} />

		case 'csv':
			return <CsvItemRenderer item={item} />

		case 'images':
			return <ImagesItemRenderer item={item} />

		case 'loading':
			return <LoadingItemRenderer item={item} progressMessage={progressMessage} />

		case 'research':
			return <ResearchItemRenderer item={item} progressMessage={progressMessage} />

		case 'error':
			return <ErrorItemRenderer item={item} onRetry={onRetry} canRetry={canRetry} />

		case 'suggestions':
			return (
				<SuggestionsItemRenderer
					item={item}
					onSuggestionClick={onSuggestionClick}
					isPending={isPending}
					isStreaming={isStreaming}
				/>
			)

		case 'metadata':
			// Metadata items are not rendered directly
			return null

		default:
			// Unknown item type - log for debugging
			console.warn('Unknown stream item type:', (item as any).type)
			return null
	}
})

// ============================================
// Individual Item Renderers
// ============================================

interface MarkdownItemRendererProps {
	item: MarkdownItem
	artifactIndex: Map<string, ChartItem | CsvItem>
	isStreaming?: boolean
	resizeTrigger?: number
	messageId?: string
	saveableChartIds?: string[]
	savedChartIds?: string[]
}

const MarkdownItemRenderer = memo(function MarkdownItemRenderer({
	item,
	artifactIndex,
	isStreaming = false,
	resizeTrigger,
	messageId,
	saveableChartIds,
	savedChartIds
}: MarkdownItemRendererProps) {
	return (
		<MarkdownRenderer
			content={item.text}
			citations={item.citations}
			artifactIndex={artifactIndex}
			isStreaming={isStreaming}
			inlineChartConfig={{
				resizeTrigger,
				messageId,
				saveableChartIds,
				savedChartIds
			}}
		/>
	)
})

interface ChartItemRendererProps {
	item: ChartItem
	resizeTrigger?: number
	messageId?: string
}

const ChartItemRenderer = memo(function ChartItemRenderer({ item, resizeTrigger, messageId }: ChartItemRendererProps) {
	// Pass chartData as-is - ChartRenderer handles both array and object formats internally
	// For arrays: data is used directly
	// For objects: ChartRenderer extracts chartData[chart.id] or uses the whole object for multi-key charts
	// Cast to any to match ChartRenderer's typed prop (which handles both cases)
	return (
		<ChartRenderer
			charts={[item.chart]}
			chartData={item.chartData as any}
			isLoading={false}
			isAnalyzing={false}
			resizeTrigger={resizeTrigger}
			messageId={messageId}
		/>
	)
})

interface CsvItemRendererProps {
	item: CsvItem
}

const CsvItemRenderer = memo(function CsvItemRenderer({ item }: CsvItemRendererProps) {
	return (
		<CSVExportArtifact
			csvExport={{
				id: item.id,
				title: item.title,
				url: item.url,
				rowCount: item.rowCount,
				filename: item.filename
			}}
		/>
	)
})

interface ImagesItemRendererProps {
	item: ImagesItem
}

const ImagesItemRenderer = memo(function ImagesItemRenderer({ item }: ImagesItemRendererProps) {
	if (!item.images?.length) return null

	return (
		<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
			{item.images.map((image, index) => (
				<div
					key={image.id || index}
					className="relative aspect-square overflow-hidden rounded-lg border border-[#e6e6e6] dark:border-[#222324]"
				>
					<img src={image.url} alt={image.filename || `Image ${index + 1}`} className="h-full w-full object-cover" />
				</div>
			))}
		</div>
	)
})

interface LoadingItemRendererProps {
	item: LoadingItem
	progressMessage?: string
}

const LoadingItemRenderer = memo(function LoadingItemRenderer({ item, progressMessage }: LoadingItemRendererProps) {
	const message = progressMessage || item.message || 'Processing...'

	return (
		<div className="flex items-center gap-2 py-2 text-[#666] dark:text-[#919296]">
			<LoadingDots />
			<span>{message}</span>
		</div>
	)
})

interface ResearchItemRendererProps {
	item: ResearchItem
	progressMessage?: string
}

const ResearchItemRenderer = memo(function ResearchItemRenderer({ item, progressMessage }: ResearchItemRendererProps) {
	if (!item.isActive) return null

	return (
		<ResearchProgress
			isActive={item.isActive}
			startTime={item.startTime}
			currentIteration={item.currentIteration}
			totalIterations={item.totalIterations}
			phase={item.phase}
			dimensionsCovered={item.dimensionsCovered}
			dimensionsPending={item.dimensionsPending}
			discoveries={item.discoveries}
			toolsExecuted={item.toolsExecuted}
			progressMessage={progressMessage || ''}
		/>
	)
})

interface ErrorItemRendererProps {
	item: ErrorItem
	onRetry?: () => void
	canRetry?: boolean
}

const ErrorItemRenderer = memo(function ErrorItemRenderer({ item, onRetry, canRetry }: ErrorItemRendererProps) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
			<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
				<Icon name="alert-triangle" height={16} width={16} />
				<span className="font-medium">Error</span>
			</div>
			<p className="text-sm text-red-700 dark:text-red-300">{item.message}</p>
			{item.code && <p className="text-xs text-red-500 dark:text-red-400">Code: {item.code}</p>}
			{canRetry && item.recoverable !== false && onRetry && (
				<button
					onClick={onRetry}
					className="mt-2 w-fit rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
				>
					Retry
				</button>
			)}
		</div>
	)
})

interface SuggestionsItemRendererProps {
	item: SuggestionsItem
	onSuggestionClick?: (suggestion: any) => void
	isPending?: boolean
	isStreaming?: boolean
}

const SuggestionsItemRenderer = memo(function SuggestionsItemRenderer({
	item,
	onSuggestionClick,
	isPending = false,
	isStreaming = false
}: SuggestionsItemRendererProps) {
	if (!item.suggestions?.length || !onSuggestionClick) return null

	// Convert to the format expected by SuggestedActions for display,
	// but include backend-compatible format for the click handler
	const formattedSuggestions = item.suggestions.map((s) => ({
		// Display properties - don't show toolName as description (it's technical, not user-facing)
		title: s.label,
		// Backend-compatible format for suggestionContext (what the API expects)
		toolName: s.action,
		arguments: s.params
	}))

	return (
		<SuggestedActions
			suggestions={formattedSuggestions}
			handleSuggestionClick={onSuggestionClick}
			isPending={isPending}
			isStreaming={isStreaming}
		/>
	)
})
