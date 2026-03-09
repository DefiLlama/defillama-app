import Router from 'next/router'
import { useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { AlertArtifact } from '~/containers/LlamaAI/components/AlertArtifact'
import { ChartRenderer } from '~/containers/LlamaAI/components/ChartRenderer'
import { CSVExportArtifact } from '~/containers/LlamaAI/components/CSVExportArtifact'
import { ImagePreviewModal } from '~/containers/LlamaAI/components/ImagePreviewModal'
import { MarkdownRenderer } from '~/containers/LlamaAI/components/MarkdownRenderer'
import { ResponseControls } from '~/containers/LlamaAI/components/ResponseControls'
import { ThinkingPanel, TOOL_ICONS, TOOL_LABELS } from '~/containers/LlamaAI/components/status/StreamingStatus'
import type {
	AlertProposedData,
	ChartConfiguration,
	ChartSet,
	CsvExport,
	Message,
	ToolExecution
} from '~/containers/LlamaAI/types'
import { parseArtifactPlaceholders } from '~/containers/LlamaAI/utils/markdownHelpers'

function buildChartIndex(chartSets: ChartSet[]) {
	const index = new Map<string, { chart: ChartConfiguration; chartData: Record<string, any[]> }>()
	for (const set of chartSets) {
		for (const chart of set.charts) {
			index.set(chart.id, { chart, chartData: set.chartData })
		}
	}
	return index
}

function createOccurrenceKeyFactory() {
	const counts = new Map<string, number>()
	return (baseKey: string) => {
		const nextCount = counts.get(baseKey) || 0
		counts.set(baseKey, nextCount + 1)
		return nextCount === 0 ? baseKey : `${baseKey}-${nextCount}`
	}
}

function getActionKey(action: { label: string; message: string }) {
	return `${action.label}:${action.message}`
}

function getToolExecutionKey(execution: ToolExecution) {
	return (
		execution.resultId ||
		`${execution.name}:${execution.executionTimeMs}:${execution.sqlQuery || ''}:${execution.error || ''}`
	)
}

function ActionButtonGroup({
	actions,
	onActionClick,
	nextUserMessage
}: {
	actions: Array<{ label: string; message: string }>
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const isDecisionGroup = actions.some((action) => action.message.startsWith('confirm:'))
	const resolvedActions = actions.map((action) => ({
		label: action.label,
		message: action.message.startsWith('confirm:') ? action.message.slice(8) : action.message
	}))
	const primaryActionKey = getActionKey(
		resolvedActions.find((action) => !action.message.startsWith('url:')) || resolvedActions[0]
	)
	const alreadyClicked = nextUserMessage
		? (resolvedActions.find((action) => !action.message.startsWith('url:') && action.message === nextUserMessage)
				?.message ?? null)
		: null
	const [clicked, setClicked] = useState<string | null>(alreadyClicked)
	const isClicked = clicked !== null

	if (isDecisionGroup) {
		return (
			<div className="flex flex-wrap items-center gap-2.5">
				{resolvedActions.map((action) => {
					const isUrl = action.message.startsWith('url:')
					const actionKey = getActionKey(action)
					const isPrimary = !isUrl && actionKey === primaryActionKey

					if (isUrl) {
						const href = action.message.slice(4)
						return (
							<a
								key={actionKey}
								{...(href.startsWith('http')
									? { href, target: '_blank', rel: 'noopener noreferrer' }
									: {
											href: `https://defillama.com${href}`,
											onClick: (event) => {
												event.preventDefault()
												void Router.push(href)
											}
										})}
								className="inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/15 bg-[#2172e5]/3 px-4 py-2 text-sm font-medium text-[#2172e5] transition-all duration-150 hover:border-[#2172e5]/35 hover:bg-[#2172e5]/8 active:scale-[0.97] dark:border-[#4190f7]/15 dark:bg-[#4190f7]/3 dark:text-[#4190f7] dark:hover:border-[#4190f7]/35 dark:hover:bg-[#4190f7]/8"
							>
								{action.label}
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M7 17L17 7" />
									<path d="M7 7h10v10" />
								</svg>
							</a>
						)
					}

					const handleClick = () => {
						if (!onActionClick || isClicked) return
						setClicked(action.message)
						onActionClick(action.message)
					}

					if (isPrimary) {
						return (
							<button
								key={actionKey}
								type="button"
								disabled={isClicked || !onActionClick}
								onClick={handleClick}
								className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
									!isClicked
										? onActionClick
											? 'bg-[#2172e5] text-white hover:bg-[#1b5fbd] active:scale-[0.97] dark:bg-[#4190f7] dark:hover:bg-[#3279de]'
											: 'bg-[#e6e6e6] text-[#999] dark:bg-[#333] dark:text-[#666]'
										: clicked === action.message
											? 'bg-[#2172e5] text-white dark:bg-[#4190f7]'
											: 'pointer-events-none bg-[#e6e6e6] text-[#999] opacity-50 dark:bg-[#333] dark:text-[#666]'
								}`}
							>
								{action.label}
							</button>
						)
					}

					return (
						<button
							key={actionKey}
							type="button"
							disabled={isClicked || !onActionClick}
							onClick={handleClick}
							className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-150 ${
								!isClicked
									? onActionClick
										? 'border-[#2172e5]/20 text-[#2172e5] hover:border-[#2172e5]/40 hover:bg-[#2172e5]/6 active:scale-[0.97] dark:border-[#4190f7]/20 dark:text-[#4190f7] dark:hover:border-[#4190f7]/40 dark:hover:bg-[#4190f7]/6'
										: 'border-[#e6e6e6] text-[#999] dark:border-[#333] dark:text-[#666]'
									: clicked === action.message
										? 'border-[#2172e5] bg-[#2172e5]/10 text-[#2172e5] dark:border-[#4190f7] dark:bg-[#4190f7]/10 dark:text-[#4190f7]'
										: 'pointer-events-none border-[#e6e6e6] text-[#999] opacity-50 dark:border-[#333] dark:text-[#666]'
							}`}
						>
							{action.label}
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{resolvedActions.map((action) => {
				const isUrl = action.message.startsWith('url:')
				const actionKey = getActionKey(action)

				if (isUrl) {
					const href = action.message.slice(4)
					return (
						<a
							key={actionKey}
							{...(href.startsWith('http')
								? { href, target: '_blank', rel: 'noopener noreferrer' }
								: {
										href: `https://defillama.com${href}`,
										onClick: (event) => {
											event.preventDefault()
											void Router.push(href)
										}
									})}
							className="inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/10 bg-[#2172e5]/4 px-3 py-1.5 text-xs font-medium text-[#2172e5]/55 transition-all duration-150 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75"
						>
							{action.label}
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="opacity-60"
							>
								<path d="M7 17L17 7" />
								<path d="M7 7h10v10" />
							</svg>
						</a>
					)
				}

				return (
					<button
						key={actionKey}
						type="button"
						disabled={isClicked || !onActionClick}
						onClick={() => {
							if (!onActionClick || isClicked) return
							setClicked(action.message)
							onActionClick(action.message)
						}}
						className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
							!isClicked
								? onActionClick
									? 'border-[#2172e5]/10 bg-[#2172e5]/4 text-[#2172e5]/55 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75'
									: 'border-[#2172e5]/5 bg-[#2172e5]/2 text-[#2172e5]/30 dark:border-[#4190f7]/5 dark:bg-[#4190f7]/2 dark:text-[#4190f7]/25'
								: clicked === action.message
									? 'border-[#2172e5]/25 bg-[#2172e5]/8 text-[#2172e5]/70 dark:border-[#4190f7]/25 dark:bg-[#4190f7]/8 dark:text-[#4190f7]/70'
									: 'pointer-events-none border-[#2172e5]/5 bg-[#2172e5]/2 text-[#2172e5]/20 opacity-50 dark:border-[#4190f7]/5 dark:bg-[#4190f7]/2 dark:text-[#4190f7]/15'
						}`}
					>
						{action.label}
					</button>
				)
			})}
		</div>
	)
}

function InlineContent({
	text,
	chartSets,
	csvExports,
	alerts,
	savedAlertIds,
	messageId,
	citations,
	toolExecutions,
	isStreaming = false,
	sessionId,
	fetchFn,
	onActionClick,
	nextUserMessage
}: {
	text: string
	chartSets: ChartSet[]
	csvExports?: CsvExport[]
	alerts?: AlertProposedData[]
	savedAlertIds?: string[]
	messageId?: string
	citations: string[]
	toolExecutions?: ToolExecution[]
	isStreaming?: boolean
	sessionId?: string | null
	fetchFn?: typeof fetch
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const chartIndex = useMemo(() => buildChartIndex(chartSets), [chartSets])
	const csvIndex = useMemo(() => {
		const index = new Map<string, CsvExport>()
		for (const csv of csvExports ?? []) index.set(csv.id, csv)
		return index
	}, [csvExports])

	const { parts, referencedChartIds, referencedCsvIds, hasActions } = useMemo(() => {
		const parsed = parseArtifactPlaceholders(text)
		return {
			parts: parsed.parts,
			referencedChartIds: parsed.chartIds,
			referencedCsvIds: parsed.csvIds,
			hasActions: parsed.actionItems.length > 0
		}
	}, [text])

	const hasInlineRefs = !isStreaming && (referencedChartIds.size > 0 || referencedCsvIds.size > 0 || hasActions)

	const groupedParts = useMemo(() => {
		const result: Array<
			(typeof parts)[number] | { type: 'action-group'; actions: Array<{ label: string; message: string }> }
		> = []
		let currentActionGroup: Array<{ label: string; message: string }> = []

		for (let index = 0; index < parts.length; index++) {
			const part = parts[index]
			if (part.type === 'action' && part.actionLabel && part.actionMessage) {
				currentActionGroup.push({ label: part.actionLabel, message: part.actionMessage })
			} else if (
				currentActionGroup.length > 0 &&
				part.type === 'text' &&
				!part.content.trim() &&
				parts.slice(index + 1).some((nextPart) => nextPart.type === 'action')
			) {
				continue
			} else {
				if (currentActionGroup.length > 0) {
					result.push({ type: 'action-group', actions: [...currentActionGroup] })
					currentActionGroup = []
				}
				result.push(part)
			}
		}

		if (currentActionGroup.length > 0) {
			result.push({ type: 'action-group', actions: currentActionGroup })
		}

		return result
	}, [parts])

	const unreferencedCharts = useMemo(() => {
		if (isStreaming) return []

		const charts: { chart: ChartConfiguration; chartData: Record<string, any[]> }[] = []
		for (const [id, entry] of chartIndex) {
			if (!referencedChartIds.has(id)) charts.push(entry)
		}

		return charts
	}, [chartIndex, referencedChartIds, isStreaming])

	const unreferencedCsvs = useMemo(() => {
		const csvs: CsvExport[] = []
		for (const [id, csv] of csvIndex) {
			if (!referencedCsvIds.has(id)) csvs.push(csv)
		}
		return csvs
	}, [csvIndex, referencedCsvIds])

	return (
		<div className="flex flex-col gap-2.5">
			{hasInlineRefs
				? (() => {
						const getKey = createOccurrenceKeyFactory()
						return groupedParts.map((part, partIndex) => {
							if ('actions' in part && part.type === 'action-group') {
								const actionGroupKey = part.actions.map((action) => `${action.label}:${action.message}`).join('|')
								return (
									<ActionButtonGroup
										key={getKey(`actions-${nextUserMessage ?? ''}-${actionGroupKey}`)}
										actions={part.actions}
										onActionClick={onActionClick}
										nextUserMessage={nextUserMessage}
									/>
								)
							}

							if (part.type === 'chart' && 'chartId' in part && part.chartId) {
								const entry = chartIndex.get(part.chartId)
								if (entry) {
									return (
										<ChartRenderer
											charts={[entry.chart]}
											chartData={entry.chartData}
											sessionId={sessionId}
											fetchFn={fetchFn}
											key={getKey(`inline-chart-${part.chartId}`)}
										/>
									)
								}

								if (isStreaming) {
									return (
										<div
											key={getKey(`chart-loading-${part.chartId}`)}
											className="my-4 flex h-[360px] animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
										>
											<p className="text-sm text-gray-500">Loading chart...</p>
										</div>
									)
								}

								return null
							}

							if (part.type === 'csv' && 'csvId' in part && part.csvId) {
								const csv = csvIndex.get(part.csvId)
								return csv ? <CSVExportArtifact key={getKey(`inline-csv-${part.csvId}`)} csvExport={csv} /> : null
							}

							if ('content' in part && !part.content) return null

							if ('content' in part) {
								const isLastText = !groupedParts
									.slice(partIndex + 1)
									.some((nextPart) => 'content' in nextPart && nextPart.content)
								return (
									<MarkdownRenderer
										key={getKey(`text-${partIndex}`)}
										content={part.content}
										citations={isLastText && citations.length > 0 ? citations : undefined}
										isStreaming={isStreaming}
									/>
								)
							}

							return null
						})
					})()
				: text && (
						<MarkdownRenderer
							content={text}
							citations={citations.length > 0 ? citations : undefined}
							isStreaming={isStreaming}
						/>
					)}

			{isStreaming && text ? <span className="inline-block h-4 w-0.5 animate-pulse bg-(--old-blue)" /> : null}

			{unreferencedCharts.map((entry) => (
				<ChartRenderer
					key={`chart-${entry.chart.id}`}
					charts={[entry.chart]}
					chartData={entry.chartData}
					sessionId={sessionId}
					fetchFn={fetchFn}
				/>
			))}

			{unreferencedCsvs.map((csv) => (
				<CSVExportArtifact key={`csv-${csv.id}`} csvExport={csv} />
			))}

			{alerts?.map((alert) => (
				<AlertArtifact
					key={alert.alertId}
					alertId={alert.alertId}
					defaultTitle={alert.title}
					alertIntent={{ ...alert.alertIntent, detected: true, toolExecutions: [] }}
					messageId={messageId}
					savedAlertIds={savedAlertIds}
				/>
			))}

			{!isStreaming && toolExecutions && toolExecutions.length > 0 ? (
				<ToolExecutionPanel toolExecutions={toolExecutions} />
			) : null}
		</div>
	)
}

function ToolExecutionPanel({ toolExecutions }: { toolExecutions: ToolExecution[] }) {
	const totalTime = toolExecutions.reduce((sum, execution) => sum + execution.executionTimeMs, 0)
	const successCount = toolExecutions.filter((execution) => execution.success).length
	const detailsRef = useRef<HTMLDetailsElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const getRowKey = createOccurrenceKeyFactory()

	return (
		<details
			ref={detailsRef}
			className="group rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324]"
			onToggle={() => {
				if (!detailsRef.current?.open) return
				requestAnimationFrame(() => {
					contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
				})
			}}
		>
			<summary className="flex w-full items-center gap-2 px-3 py-2 text-left">
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="shrink-0 text-[#999] transition-transform group-open:rotate-90 dark:text-[#666]"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
				<span className="flex-1 text-xs text-[#666] dark:text-[#919296]">
					{toolExecutions.length} tool call{toolExecutions.length !== 1 ? 's' : ''}
				</span>
				<span className="text-xs text-[#999] dark:text-[#666]">
					{successCount}/{toolExecutions.length} ok
				</span>
				<span className="font-mono text-[10px] text-[#999] tabular-nums dark:text-[#666]">{totalTime}ms</span>
			</summary>
			<div
				ref={contentRef}
				className="flex flex-col gap-1 border-t border-[#e6e6e6] px-3 py-2 select-text dark:border-[#222324]"
			>
				{toolExecutions.map((execution) => (
					<ToolExecutionRow key={getRowKey(getToolExecutionKey(execution))} execution={execution} />
				))}
			</div>
		</details>
	)
}

function ToolExecutionRow({ execution }: { execution: ToolExecution }) {
	const [showPreview, setShowPreview] = useState(false)
	const meta = TOOL_ICONS[execution.name] || { icon: 'sparkles', color: '#919296' }
	const label = TOOL_LABELS[execution.name] || execution.name

	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={() =>
					(execution.resultPreview?.length || execution.sqlQuery || execution.toolData) && setShowPreview(!showPreview)
				}
				className="flex items-center gap-2 py-0.5 text-left"
			>
				<Icon name={meta.icon as never} height={12} width={12} className="shrink-0" style={{ color: meta.color }} />
				<span className="flex-1 text-xs text-[#555] dark:text-[#ccc]">{label}</span>
				{execution.success ? (
					<span className="text-[10px] text-green-600 dark:text-green-400">ok</span>
				) : (
					<span className="text-[10px] text-red-500">err</span>
				)}
				<span className="font-mono text-[10px] text-[#999] tabular-nums dark:text-[#666]">
					{execution.executionTimeMs}ms
				</span>
				{execution.resultCount != null ? (
					<span className="text-[10px] text-[#999] dark:text-[#666]">{execution.resultCount} rows</span>
				) : null}
			</button>
			{showPreview && execution.sqlQuery ? (
				<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
					{execution.sqlQuery}
				</pre>
			) : null}
			{showPreview && execution.resultPreview && execution.resultPreview.length > 0 ? (
				<div className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1 dark:border-[#333] dark:bg-[#1a1a1a]">
					<table className="text-[10px]">
						<thead>
							<tr>
								{Object.keys(execution.resultPreview[0]).map((column) => (
									<th key={column} className="px-1.5 py-0.5 text-left font-medium text-[#666] dark:text-[#999]">
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{execution.resultPreview.map((row, rowIndex) => (
								<tr key={rowIndex}>
									{Object.values(row).map((value, columnIndex) => (
										<td key={columnIndex} className="px-1.5 py-0.5 text-[#444] dark:text-[#bbb]">
											{String(value ?? '')}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
			{showPreview && execution.toolData ? <ToolDataView name={execution.name} data={execution.toolData} /> : null}
			{!execution.success && execution.error ? (
				<p className="mt-0.5 text-[10px] text-red-500">{execution.error}</p>
			) : null}
		</div>
	)
}

function ToolDataView({ name, data }: { name: string; data: Record<string, any> }) {
	if (name === 'resolve_entity') {
		const results = data.results || (data.topMatch ? { _single: data } : null)
		if (!results) return null
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{Object.entries(results).map(([term, value]: [string, any]) => (
					<div key={term} className="flex items-center gap-2 text-[10px]">
						{term !== '_single' ? <span className="font-medium text-[#666] dark:text-[#999]">{term}:</span> : null}
						{value.topMatch ? (
							<span className="text-[#444] dark:text-[#bbb]">
								{value.topMatch.slug}{' '}
								<span className="text-[#999]">
									({value.topMatch.type}, {Math.round(value.topMatch.confidence * 100)}%)
								</span>
								{value.matchCount > 1 ? <span className="text-[#999]"> +{value.matchCount - 1} more</span> : null}
							</span>
						) : (
							<span className="text-[#999]">no match</span>
						)}
					</div>
				))}
			</div>
		)
	}

	if (name === 'generate_chart' && data.charts) {
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{data.charts.map((chart: any) => (
					<div key={chart.id} className="text-[10px] text-[#444] dark:text-[#bbb]">
						<span className="font-medium">{chart.title}</span>{' '}
						<span className="text-[#999]">
							({chart.type}, {chart.seriesCount} series)
						</span>
					</div>
				))}
			</div>
		)
	}

	if (name === 'execute_code' && data.logs?.length) {
		return (
			<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
				{data.logs.join('\n')}
			</pre>
		)
	}

	if (name === 'load_skill') {
		return (
			<div className="mt-1 mb-1 text-[10px] text-[#444] dark:text-[#bbb]">
				<span className="font-medium">{data.skill}</span>
				{data.unlockedTools?.length > 0 ? (
					<span className="text-[#999]"> - unlocked: {data.unlockedTools.join(', ')}</span>
				) : null}
			</div>
		)
	}

	if (name === 'spawn_agent' && data.agents) {
		return (
			<div className="mt-1 mb-1 flex flex-col gap-0.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 dark:border-[#333] dark:bg-[#1a1a1a]">
				{data.agents.map((agent: any) => (
					<div key={agent.id} className="text-[10px] text-[#444] dark:text-[#bbb]">
						Agent {agent.id.slice(0, 6)}{' '}
						<span className="text-[#999]">
							({agent.toolCalls} tool calls{agent.chartCount > 0 ? `, ${agent.chartCount} charts` : ''})
						</span>
					</div>
				))}
			</div>
		)
	}

	if (name === 'web_search') {
		return <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.citationCount} sources</span>
	}

	if (name === 'x_search') {
		return <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.tweetCount} tweets</span>
	}

	return null
}

export function MessageBubble({
	message,
	sessionId,
	isDraft = false,
	fetchFn,
	readOnly = false,
	isLlama = false,
	onActionClick,
	nextUserMessage
}: {
	message: Message
	sessionId: string | null
	isDraft?: boolean
	fetchFn?: typeof fetch
	readOnly?: boolean
	isLlama?: boolean
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)

	if (message.role === 'user') {
		return (
			<div className="ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 wrap-break-word dark:bg-[#222425]">
				{message.images && message.images.length > 0 ? (
					<div className="mb-2.5 flex flex-wrap gap-3">
						{message.images.map((image) => (
							<button
								key={`sent-image-${image.url}`}
								type="button"
								onClick={() => setPreviewImage(image.url)}
								className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg"
							>
								<img src={image.url} alt={image.filename || 'Uploaded image'} className="h-full w-full object-cover" />
							</button>
						))}
					</div>
				) : null}
				<p>{message.content}</p>
				<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
			</div>
		)
	}

	const chartList =
		message.charts?.flatMap((set) => set.charts.map((chart) => ({ id: chart.id, title: chart.title }))) ?? []

	return (
		<>
			{message.thinking ? <ThinkingPanel thinking={message.thinking} defaultOpen={isDraft} /> : null}
			<InlineContent
				text={message.content || ''}
				chartSets={message.charts || []}
				csvExports={message.csvExports}
				alerts={readOnly ? undefined : message.alerts}
				savedAlertIds={message.savedAlertIds}
				messageId={message.id}
				citations={message.citations || []}
				toolExecutions={isLlama ? message.toolExecutions : undefined}
				isStreaming={isDraft}
				sessionId={sessionId}
				fetchFn={fetchFn}
				onActionClick={onActionClick}
				nextUserMessage={nextUserMessage}
			/>
			{message.id && !isDraft ? (
				<ResponseControls
					messageId={message.id}
					content={message.content}
					sessionId={sessionId}
					readOnly={readOnly}
					charts={chartList}
				/>
			) : null}
		</>
	)
}
