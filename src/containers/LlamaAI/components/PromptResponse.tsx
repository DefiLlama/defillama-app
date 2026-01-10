import { memo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { ChartRenderer } from './ChartRenderer'
import { InlineSuggestions } from './InlineSuggestions'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ResearchProgress } from './ResearchProgress'

interface PromptResponseProps {
	response?: {
		answer: string
		metadata?: any
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
		citations?: string[]
		inlineSuggestions?: string
		csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
	}
	error?: string
	streamingError?: string
	isPending: boolean
	streamingResponse?: string
	isStreaming?: boolean
	progressMessage?: string
	onSuggestionClick?: (suggestion: any) => void
	onRetry?: () => void
	canRetry?: boolean
	isGeneratingCharts?: boolean
	isAnalyzingForCharts?: boolean
	hasChartError?: boolean
	isGeneratingSuggestions?: boolean
	expectedChartInfo?: { count?: number; types?: string[] } | null
	resizeTrigger?: number
	showMetadata?: boolean
	readOnly?: boolean
	inlineChartConfig?: {
		resizeTrigger?: number
		saveableChartIds?: string[]
		savedChartIds?: string[]
		messageId?: string
	}
	streamingCsvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }> | null
	researchState?: {
		isActive: boolean
		startTime: number
		currentIteration: number
		totalIterations: number
		phase: 'planning' | 'fetching' | 'analyzing' | 'synthesizing'
		dimensionsCovered: string[]
		dimensionsPending: string[]
		discoveries: string[]
		toolsExecuted: number
	} | null
}

export const SuggestedActions = memo(function SuggestedActions({
	suggestions,
	handleSuggestionClick,
	isPending,
	isStreaming
}: {
	suggestions: any[]
	handleSuggestionClick: (suggestion: any) => void
	isPending: boolean
	isStreaming: boolean
}) {
	return (
		<div className="mt-4 grid gap-2 text-[#666] dark:text-[#919296]">
			<h1>Suggested actions:</h1>
			<div className="grid gap-2">
				{suggestions.map((suggestion) => (
					<button
						key={`${suggestion.title}-${suggestion.description}`}
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
})

export const QueryMetadata = memo(function QueryMetadata({ metadata }: { metadata: any }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		if (!metadata) return
		try {
			await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
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
})

export const PromptResponse = memo(function PromptResponse({
	response,
	error,
	streamingError,
	isPending,
	streamingResponse,
	isStreaming,
	progressMessage,
	onSuggestionClick,
	onRetry,
	canRetry,
	isGeneratingCharts = false,
	isAnalyzingForCharts = false,
	hasChartError = false,
	isGeneratingSuggestions = false,
	expectedChartInfo,
	resizeTrigger = 0,
	showMetadata = false,
	readOnly = false,
	inlineChartConfig,
	streamingCsvExports,
	researchState
}: PromptResponseProps) {
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

	if (error) {
		return <p className="text-(--error)">{error}</p>
	}
	if (isPending || isStreaming) {
		return (
			<>
				{streamingError ? (
					<div className="text-(--error)">{streamingError}</div>
				) : isStreaming && streamingResponse ? (
					<MarkdownRenderer
						content={streamingResponse}
						citations={response?.citations}
						isStreaming={isStreaming}
						charts={response?.charts}
						chartData={response?.chartData}
						inlineChartConfig={inlineChartConfig}
						csvExports={streamingCsvExports || undefined}
					/>
				) : isStreaming && researchState?.isActive ? (
					<ResearchProgress
						isActive={researchState.isActive}
						startTime={researchState.startTime}
						currentIteration={researchState.currentIteration}
						totalIterations={researchState.totalIterations}
						phase={researchState.phase}
						dimensionsCovered={researchState.dimensionsCovered}
						dimensionsPending={researchState.dimensionsPending}
						discoveries={researchState.discoveries}
						toolsExecuted={researchState.toolsExecuted}
						progressMessage={progressMessage || ''}
					/>
				) : isStreaming && progressMessage ? (
					<p
						className={`flex items-center justify-start gap-2 py-2 ${
							progressMessage.includes('encountered an issue') ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'
						}`}
					>
						{progressMessage.includes('encountered an issue') ? (
							<Icon name="alert-triangle" height={16} width={16} className="text-(--error)" />
						) : (
							<img src="/icons/llamaai_animation.webp" alt="Loading" className="h-24 w-24 shrink-0" />
						)}
						<span className="flex flex-wrap items-center gap-1">{progressMessage}</span>
					</p>
				) : (
					<p className="flex min-h-9 items-center gap-1 py-2 text-[#666] dark:text-[#919296]">
						Thinking
						<LoadingDots />
					</p>
				)}
				{(isAnalyzingForCharts || isGeneratingCharts || hasChartError) && !streamingResponse?.includes('[CHART:') && (
					<ChartRenderer
						charts={[]}
						chartData={[]}
						isLoading={isAnalyzingForCharts || isGeneratingCharts}
						isAnalyzing={isAnalyzingForCharts}
						hasError={hasChartError}
						expectedChartCount={expectedChartInfo?.count}
						chartTypes={expectedChartInfo?.types}
						resizeTrigger={resizeTrigger}
					/>
				)}
				{!readOnly && isGeneratingSuggestions && (
					<div className="mt-4 grid gap-2">
						<h1 className="text-[#666] dark:text-[#919296]">Suggested actions:</h1>
						<p className="flex items-center gap-2 text-[#666] dark:text-[#919296]">
							<img src="/icons/llamaai_animation.webp" alt="Loading" className="h-24 w-24 shrink-0" />
							<span>Generating follow-up suggestions...</span>
						</p>
					</div>
				)}
			</>
		)
	}

	const remainingCharts = (() => {
		if (!response?.charts?.length) return null
		const inlineIds = new Set<string>()
		const pattern = /\[CHART:([^\]]+)\]/g
		let match: RegExpExecArray | null
		while ((match = pattern.exec(response.answer || '')) !== null) {
			inlineIds.add(match[1])
		}
		const filtered = response.charts.filter((c: any) => !inlineIds.has(c.id))
		if (!filtered.length) return null
		const data = Array.isArray(response.chartData)
			? response.chartData
			: filtered.flatMap((c: any) => response.chartData?.[c.id] || [])
		return { charts: filtered, data }
	})()

	return (
		<>
			{response?.answer && (
				<MarkdownRenderer
					content={response.answer}
					citations={response.citations}
					charts={response.charts}
					chartData={response.chartData}
					inlineChartConfig={inlineChartConfig}
					csvExports={response.csvExports}
				/>
			)}
			{remainingCharts && (
				<ChartRenderer
					charts={remainingCharts.charts}
					chartData={remainingCharts.data}
					isLoading={false}
					isAnalyzing={false}
					expectedChartCount={expectedChartInfo?.count}
					chartTypes={expectedChartInfo?.types}
					resizeTrigger={resizeTrigger}
				/>
			)}
			{response?.inlineSuggestions && <InlineSuggestions text={response.inlineSuggestions} />}
			{!readOnly && response?.suggestions && response.suggestions.length > 0 && (
				<SuggestedActions
					suggestions={response.suggestions}
					handleSuggestionClick={onSuggestionClick}
					isPending={isPending}
					isStreaming={isStreaming}
				/>
			)}
			{showMetadata && response?.metadata && <QueryMetadata metadata={response.metadata} />}
		</>
	)
})
