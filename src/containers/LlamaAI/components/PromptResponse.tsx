import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import type { StreamItem, ChartItem, CsvItem, MarkdownItem } from '../types'
import { StreamItemRenderer } from './StreamItemRenderer'

interface PromptResponseProps {
	/** Items-based rendering */
	items?: StreamItem[]
	error?: string
	streamingError?: string
	isPending: boolean
	isStreaming?: boolean
	progressMessage?: string
	onSuggestionClick?: (suggestion: any) => void
	onRetry?: () => void
	canRetry?: boolean
	resizeTrigger?: number
	showMetadata?: boolean
	readOnly?: boolean
	inlineChartConfig?: {
		resizeTrigger?: number
		saveableChartIds?: string[]
		savedChartIds?: string[]
		messageId?: string
		alertIntent?: import('../types').AlertIntent
		savedAlertIds?: string[]
	}
}

export function SuggestedActions({
	suggestions,
	handleSuggestionClick,
	isPending,
	isStreaming
}: {
	suggestions: any[]
	handleSuggestionClick: (suggestion: any) => void
	isPending: boolean
	isStreaming?: boolean
}) {
	return (
		<div className="mt-4 grid gap-2 text-[#666] dark:text-[#919296]">
			<h1>Suggested actions:</h1>
			<div className="grid gap-2">
				{suggestions.map((suggestion, index) => (
					<button
						key={`suggestion-${index}-${suggestion.title || ''}`}
						onClick={() => handleSuggestionClick(suggestion)}
						disabled={isPending || isStreaming}
						data-umami-event="llamaai-suggestion-click"
						className={`group flex touch-pan-y items-center justify-between gap-3 rounded-lg border border-[#e6e6e6] p-2 text-left dark:border-[#222324] ${
							isPending || isStreaming
								? 'cursor-not-allowed opacity-60'
								: 'hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 active:border-(--old-blue) active:bg-(--old-blue)/12'
						}`}
					>
						<span className="flex flex-1 flex-col items-start gap-1">
							<span className={suggestion.description ? 'font-semibold' : ''}>{suggestion.title}</span>
							{suggestion.description ? <span>{suggestion.description}</span> : null}
						</span>
						<Icon name="arrow-right" height={16} width={16} className="shrink-0" />
					</button>
				))}
			</div>
		</div>
	)
}

export function QueryMetadata({ metadata }: { metadata: any }) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])
	const handleCopy = async () => {
		if (!metadata) return
		try {
			await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
			setCopied(true)
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log('Failed to copy content:', error)
		}
	}

	return (
		<details className="group rounded-lg border border-[#e6e6e6] dark:border-[#222324]">
			<summary className="flex flex-wrap items-center justify-end gap-2 p-2 text-[#666] group-open:text-black group-hover:bg-[#f7f7f7] group-hover:text-black dark:text-[#919296] dark:group-open:text-white dark:group-hover:bg-[#222324] dark:group-hover:text-white">
				<span className="mr-auto">Query Metadata</span>
				<Tooltip content="Copy" render={<button onClick={handleCopy} />} className="hidden group-open:block">
					{copied ? (
						<Icon name="check-circle" height={14} width={14} />
					) : (
						<Icon name="clipboard" height={14} width={14} />
					)}
					<span className="sr-only">Copy</span>
				</Tooltip>
				<span className="flex items-center gap-1">
					<Icon name="chevron-down" height={14} width={14} className="transition-transform group-open:rotate-180" />
					<span className="group-open:hidden">Show</span>
					<span className="hidden group-open:block">Hide</span>
				</span>
			</summary>
			<pre className="overflow-auto border-t border-[#e6e6e6] p-2 text-xs select-text dark:border-[#222324]">
				{JSON.stringify(metadata, null, 2)}
			</pre>
		</details>
	)
}

export function PromptResponse({
	items,
	error,
	streamingError,
	isPending,
	isStreaming,
	progressMessage,
	onSuggestionClick,
	onRetry,
	canRetry,
	resizeTrigger = 0,
	showMetadata: _showMetadata = false,
	readOnly = false,
	inlineChartConfig
}: PromptResponseProps) {
	// Build artifact index for O(1) lookup
	// Charts and CSVs go in artifactIndex for inline rendering via markdown [CHART:id]/[CSV:id] refs
	// Artifacts referenced inline are NOT in renderableItems (to avoid duplicates)
	// Artifacts NOT referenced inline ARE added to renderableItems (to be rendered standalone)
	const { artifactIndex, renderableItems } = useMemo(() => {
		if (!items || items.length === 0) {
			return { artifactIndex: new Map<string, ChartItem | CsvItem>(), renderableItems: [] }
		}

		const index = new Map<string, ChartItem | CsvItem>()
		const renderable: StreamItem[] = []

		// First pass: collect all markdown content to find inline artifact references
		const allMarkdownContent = items
			.filter((item): item is MarkdownItem => item.type === 'markdown')
			.map((item) => item.text)
			.join('')

		// Find all artifact IDs referenced in markdown
		// Backend uses [CHART:id] and [CSV:id] patterns
		const referencedIds = new Set<string>()
		const chartRefPattern = /\[CHART:([^\]]+)\]/g
		const csvRefPattern = /\[CSV:([^\]]+)\]/g
		let match
		while ((match = chartRefPattern.exec(allMarkdownContent)) !== null) {
			referencedIds.add(match[1])
		}
		while ((match = csvRefPattern.exec(allMarkdownContent)) !== null) {
			referencedIds.add(match[1])
		}

		// Check if we have actual content (markdown with text) - if so, skip loading/research items
		// The streaming text itself indicates content is being generated, no need for extra loading UI
		const hasMarkdownContent = allMarkdownContent.trim().length > 0

		// Single pass: preserve original item order while filtering
		for (const item of items) {
			if (item.type === 'chart' || item.type === 'csv') {
				// All artifacts go in index for potential inline rendering
				index.set(item.id, item)
				// Only add to renderable if NOT referenced inline (preserves original order)
				if (!referencedIds.has(item.id)) {
					renderable.push(item)
				}
			} else if ((item.type === 'loading' || item.type === 'research') && hasMarkdownContent) {
				// Skip loading/research items when we have actual content streaming
				// The streaming text itself is the indicator that content is being generated
				continue
			} else if (item.type !== 'metadata' && item.type !== 'suggestions') {
				// Non-artifact, non-metadata, non-suggestions items are rendered directly
				// Suggestions are filtered out so parent can render them after ResponseControls
				renderable.push(item)
			}
		}

		return { artifactIndex: index, renderableItems: renderable }
	}, [items])

	// Handle error with retry
	if (error && canRetry) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-(--error)">{error}</p>
				<button
					onClick={onRetry}
					data-umami-event="llamaai-retry-request"
					className="flex w-fit items-center justify-center gap-2 rounded-lg border border-(--old-blue) bg-(--old-blue)/12 px-4 py-2 text-(--old-blue) hover:bg-(--old-blue) hover:text-white"
				>
					<Icon name="repeat" height={16} width={16} />
					Retry
				</button>
			</div>
		)
	}

	// Handle error without retry
	if (error) {
		return <p className="text-(--error)">{error}</p>
	}

	// Handle streaming error
	if (streamingError) {
		return <div className="text-(--error)">{streamingError}</div>
	}

	// No items yet - show initial loading
	if (renderableItems.length === 0 && (isPending || isStreaming)) {
		return (
			<p className="flex min-h-9 items-center gap-1 py-2 text-[#666] dark:text-[#919296]">
				Thinking
				<LoadingDots />
			</p>
		)
	}

	// Render items
	return (
		<>
			{renderableItems.map((item) => (
				<StreamItemRenderer
					key={item.id}
					item={item}
					artifactIndex={artifactIndex}
					isStreaming={isStreaming}
					isPending={isPending}
					onSuggestionClick={readOnly ? undefined : onSuggestionClick}
					onRetry={onRetry}
					canRetry={canRetry}
					resizeTrigger={inlineChartConfig?.resizeTrigger ?? resizeTrigger}
					messageId={inlineChartConfig?.messageId}
					saveableChartIds={inlineChartConfig?.saveableChartIds}
					savedChartIds={inlineChartConfig?.savedChartIds}
					progressMessage={progressMessage}
				/>
			))}
		</>
	)
}
