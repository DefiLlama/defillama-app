import Router from 'next/router'
import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefCallback } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
import { AlertArtifact, AlertArtifactLoading } from '~/containers/LlamaAI/components/AlertArtifact'
import { ChartRenderer } from '~/containers/LlamaAI/components/charts/ChartRenderer'
import { CSVExportArtifact } from '~/containers/LlamaAI/components/CSVExportArtifact'
import { ImagePreviewModal } from '~/containers/LlamaAI/components/ImagePreviewModal'
import { ChatMarkdownRenderer, SourcesList } from '~/containers/LlamaAI/components/markdown/ChatMarkdownRenderer'
import { MarkdownExportArtifact } from '~/containers/LlamaAI/components/MarkdownExportArtifact'
import { ResponseControls } from '~/containers/LlamaAI/components/ResponseControls'
import {
	ThinkingPanel,
	TOOL_ICONS,
	TOOL_LABELS,
	useHackerMode
} from '~/containers/LlamaAI/components/status/StreamingStatus'
import {
	parseMessageToRenderModel,
	type ArtifactRecord,
	type MessageRenderBlock
} from '~/containers/LlamaAI/renderModel'
import type { DashboardArtifact } from '~/containers/LlamaAI/types'
import type { Message, ToolExecution } from '~/containers/LlamaAI/types'
import { sanitizeUrl } from '~/containers/LlamaAI/utils/markdownHelpers'
import { trackUmamiEvent } from '~/utils/analytics/umami'

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

function getIndexedActionKey(action: { label: string; message: string }, index: number) {
	return `${getActionKey(action)}-${index}`
}

function getToolExecutionKey(execution: ToolExecution) {
	return (
		execution.resultId ||
		`${execution.name}:${execution.executionTimeMs}:${execution.sqlQuery || ''}:${execution.error || ''}`
	)
}

function sanitizeExternalActionHref(href: string) {
	const safeHref = sanitizeUrl(href)
	if (!safeHref) return null

	try {
		const parsed = new URL(safeHref)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
	} catch {
		return null
	}
}

function getActionHrefProps(href: string, label: string) {
	if (href.startsWith('http')) {
		const safeHref = sanitizeExternalActionHref(href)
		return {
			href: safeHref ?? '#',
			...(safeHref
				? {
						target: '_blank' as const,
						rel: 'noopener noreferrer'
					}
				: {}),
			onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
				if (!safeHref) {
					event.preventDefault()
				}
				trackUmamiEvent('llamaai-action-link-click', { label })
			}
		}
	}

	return {
		href: `https://defillama.com${href}`,
		onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
			trackUmamiEvent('llamaai-action-link-click', { label })
			event.preventDefault()
			void Router.push(href)
		}
	}
}

function extractActionUrl(message: string) {
	if (!message.startsWith('url:')) return null
	const href = message.slice(4).trim()
	return href.length > 0 ? href : null
}

function ActionLink({
	action,
	variant
}: {
	action: { label: string; message: string; compositeId: string }
	variant: 'decision' | 'suggestion'
}) {
	const href = extractActionUrl(action.message)

	if (!href) {
		return <span className="inline-flex items-center gap-1.5 text-inherit">{action.label}</span>
	}

	return (
		<a
			{...getActionHrefProps(href, action.label)}
			className={
				variant === 'decision'
					? 'inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/15 bg-[#2172e5]/3 px-4 py-2 text-sm font-medium text-[#2172e5] transition-all duration-150 hover:border-[#2172e5]/35 hover:bg-[#2172e5]/8 active:scale-[0.97] dark:border-[#4190f7]/15 dark:bg-[#4190f7]/3 dark:text-[#4190f7] dark:hover:border-[#4190f7]/35 dark:hover:bg-[#4190f7]/8'
					: 'inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/10 bg-[#2172e5]/4 px-3 py-1.5 text-xs font-medium text-[#2172e5]/55 transition-all duration-150 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75'
			}
		>
			{action.label}
			<svg
				width={variant === 'decision' ? '12' : '10'}
				height={variant === 'decision' ? '12' : '10'}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={variant === 'decision' ? undefined : 'opacity-60'}
			>
				<path d="M7 17L17 7" />
				<path d="M7 7h10v10" />
			</svg>
		</a>
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
	const resolvedActions = actions.map((action, index) => {
		const resolvedAction = {
			label: action.label,
			message: action.message.startsWith('confirm:') ? action.message.slice(8) : action.message
		}
		return {
			...resolvedAction,
			compositeId: getIndexedActionKey(resolvedAction, index)
		}
	})
	const actionSignature = resolvedActions.map((action) => action.compositeId).join('|')
	const primaryActionKey = (resolvedActions.find((action) => !action.message.startsWith('url:')) || resolvedActions[0])
		?.compositeId
	const optimisticScope = `${actionSignature}:${nextUserMessage ?? ''}`
	const alreadyClicked = nextUserMessage
		? (resolvedActions.find((action) => !action.message.startsWith('url:') && action.message === nextUserMessage)
				?.compositeId ?? null)
		: null
	const [optimisticClickedIds, setOptimisticClickedIds] = useState<{ ids: Set<string>; scope: string } | null>(null)
	const clickedIds = new Set<string>()
	if (alreadyClicked) clickedIds.add(alreadyClicked)
	if (optimisticClickedIds?.scope === optimisticScope) {
		for (const id of optimisticClickedIds.ids) {
			clickedIds.add(id)
		}
	}

	const handleActionClick = (action: { label: string; message: string; compositeId: string }) => {
		if (!onActionClick) return
		trackUmamiEvent('llamaai-action-click', { label: action.label })
		setOptimisticClickedIds((current) => {
			const ids = current?.scope === optimisticScope ? new Set(current.ids) : new Set<string>()
			ids.add(action.compositeId)
			return { ids, scope: optimisticScope }
		})
		onActionClick(action.message)
	}

	if (isDecisionGroup) {
		return (
			<div className="flex flex-wrap items-center gap-2.5">
				{resolvedActions.map((action) => {
					const isUrl = action.message.startsWith('url:')
					const actionKey = action.compositeId
					const isPrimary = !isUrl && actionKey === primaryActionKey

					if (isUrl) {
						return <ActionLink key={actionKey} action={action} variant="decision" />
					}

					if (isPrimary) {
						return (
							<button
								key={actionKey}
								type="button"
								disabled={!onActionClick}
								onClick={() => handleActionClick(action)}
								className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
									!clickedIds.has(action.compositeId)
										? onActionClick
											? 'bg-[#2172e5] text-white hover:bg-[#1b5fbd] active:scale-[0.97] dark:bg-[#4190f7] dark:hover:bg-[#3279de]'
											: 'bg-[#e6e6e6] text-[#999] dark:bg-[#333] dark:text-[#666]'
										: 'bg-[#2172e5] text-white dark:bg-[#4190f7]'
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
							disabled={!onActionClick}
							onClick={() => handleActionClick(action)}
							className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-150 ${
								!clickedIds.has(action.compositeId)
									? onActionClick
										? 'border-[#2172e5]/20 text-[#2172e5] hover:border-[#2172e5]/40 hover:bg-[#2172e5]/6 active:scale-[0.97] dark:border-[#4190f7]/20 dark:text-[#4190f7] dark:hover:border-[#4190f7]/40 dark:hover:bg-[#4190f7]/6'
										: 'border-[#e6e6e6] text-[#999] dark:border-[#333] dark:text-[#666]'
									: 'border-[#2172e5] bg-[#2172e5]/10 text-[#2172e5] dark:border-[#4190f7] dark:bg-[#4190f7]/10 dark:text-[#4190f7]'
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
				const actionKey = action.compositeId

				if (isUrl) {
					return <ActionLink key={actionKey} action={action} variant="suggestion" />
				}

				return (
					<button
						key={actionKey}
						type="button"
						disabled={!onActionClick}
						onClick={() => handleActionClick(action)}
						className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
							!clickedIds.has(action.compositeId)
								? onActionClick
									? 'border-[#2172e5]/10 bg-[#2172e5]/4 text-[#2172e5]/55 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75'
									: 'border-[#2172e5]/5 bg-[#2172e5]/2 text-[#2172e5]/30 dark:border-[#4190f7]/5 dark:bg-[#4190f7]/2 dark:text-[#4190f7]/25'
								: 'border-[#2172e5]/25 bg-[#2172e5]/8 text-[#2172e5]/70 dark:border-[#4190f7]/25 dark:bg-[#4190f7]/8 dark:text-[#4190f7]/70'
						}`}
					>
						{action.label}
					</button>
				)
			})}
		</div>
	)
}

function StreamingChartPlaceholder() {
	return (
		<div className="my-4 flex h-[360px] animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
			<p className="text-sm text-gray-500">Loading chart...</p>
		</div>
	)
}

function StreamingImagePlaceholder() {
	return (
		<div
			className="my-2 flex w-full max-w-[220px] animate-pulse items-center justify-center overflow-hidden rounded-lg border border-(--old-blue)/20 bg-(--old-blue)/5"
			style={{ aspectRatio: '1 / 1' }}
		>
			<div className="flex flex-col items-center gap-1.5 text-(--old-blue)">
				<Icon name="image-plus" height={24} width={24} />
				<p className="text-xs">Generating image…</p>
			</div>
		</div>
	)
}

function parseAspectRatio(size?: string): string | undefined {
	if (!size) return undefined
	const match = size.match(/^(\d+)x(\d+)$/)
	if (!match) return undefined
	return `${match[1]} / ${match[2]}`
}

function GeneratedImageBlock({
	url,
	prompt,
	size,
	onImageClick
}: {
	url: string
	prompt?: string
	size?: string
	onImageClick?: (url: string) => void
}) {
	const [loaded, setLoaded] = useState(false)
	const [errored, setErrored] = useState(false)
	const aspect = parseAspectRatio(size)
	const interactive = !errored && !!onImageClick

	if (errored) {
		return (
			<div
				role="img"
				aria-label={prompt ? `Failed to load generated image for prompt: ${prompt}` : 'Failed to load generated image'}
				className="my-2 flex w-full max-w-sm flex-col items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-red-600 dark:text-red-400"
				style={aspect ? { aspectRatio: aspect } : undefined}
			>
				<Icon name="alert-triangle" height={24} width={24} />
				<p className="text-sm font-medium">Image failed to load</p>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs underline opacity-80 hover:opacity-100"
				>
					Open original
				</a>
			</div>
		)
	}

	return (
		<button
			type="button"
			onClick={() => (interactive && url ? onImageClick?.(url) : undefined)}
			title={prompt}
			aria-label={prompt || 'Generated image'}
			disabled={!interactive}
			className={`group/genimg relative my-2 block w-full max-w-sm overflow-hidden rounded-lg border border-black/10 bg-black/5 transition focus-visible:ring-2 focus-visible:ring-(--old-blue) focus-visible:outline-none dark:border-white/10 dark:bg-white/5 ${interactive ? 'cursor-pointer hover:border-black/20 dark:hover:border-white/20' : 'cursor-default'}`}
			style={aspect ? { aspectRatio: aspect } : undefined}
		>
			{!loaded ? (
				<div
					aria-hidden="true"
					className="absolute inset-0 animate-pulse bg-gradient-to-br from-(--old-blue)/10 via-(--old-blue)/5 to-transparent"
				/>
			) : null}
			<img
				src={url}
				alt={prompt || 'Generated image'}
				loading="lazy"
				decoding="async"
				onLoad={() => setLoaded(true)}
				onError={() => setErrored(true)}
				className={`block h-auto w-full transition-all duration-500 ease-out ${loaded ? 'blur-0 scale-100 opacity-100' : 'scale-[1.02] opacity-0 blur-sm'}`}
			/>
		</button>
	)
}

function ArtifactBlockRenderer({
	block,
	artifact,
	isStreaming,
	sessionId,
	messageId,
	onImageClick
}: {
	block: Extract<MessageRenderBlock, { type: 'chart' | 'csv' | 'md' | 'alert' | 'dashboard' | 'image' }>
	artifact?: ArtifactRecord
	isStreaming: boolean
	sessionId?: string | null
	messageId?: string
	onImageClick?: (url: string) => void
}) {
	if (block.type === 'chart') {
		// Inline chart placeholders may arrive before the chart event, so keep rendering a skeleton until the artifact resolves.
		if (!artifact) {
			return isStreaming ? <StreamingChartPlaceholder /> : null
		}
		if (artifact.type !== 'chart') return null
		return (
			<ChartRenderer
				charts={artifact.charts}
				chartData={artifact.chartData}
				sessionId={sessionId}
				messageId={messageId}
			/>
		)
	}

	if (block.type === 'csv') {
		if (!artifact || isStreaming) return null
		if (artifact.type !== 'csv') return null
		return (
			<CSVExportArtifact
				csvExport={{
					id: artifact.id,
					title: artifact.title,
					url: artifact.url,
					rowCount: artifact.rowCount,
					filename: artifact.filename
				}}
				sessionId={sessionId}
				messageId={messageId}
			/>
		)
	}

	if (block.type === 'md') {
		if (!artifact || isStreaming) return null
		if (artifact.type !== 'md') return null
		return (
			<MarkdownExportArtifact
				mdExport={{
					id: artifact.id,
					title: artifact.title,
					url: artifact.url,
					filename: artifact.filename
				}}
				sessionId={sessionId}
				messageId={messageId}
			/>
		)
	}

	if (block.type === 'dashboard') {
		if (!artifact || artifact.type !== 'dashboard') return null
		return <DashboardInlineCard dashboard={artifact.dashboard} />
	}

	if (block.type === 'image') {
		if (!artifact) {
			return isStreaming ? <StreamingImagePlaceholder /> : null
		}
		if (artifact.type !== 'image') return null
		return (
			<GeneratedImageBlock
				url={artifact.image.url}
				prompt={artifact.image.prompt}
				size={artifact.image.size}
				onImageClick={onImageClick}
			/>
		)
	}

	if (!artifact) {
		return isStreaming ? <AlertArtifactLoading /> : null
	}
	if (artifact.type !== 'alert') return null

	return (
		<AlertArtifact
			alertId={artifact.id}
			defaultTitle={artifact.title}
			alertIntent={{ ...artifact.alert.alertIntent, detected: true, toolExecutions: [] }}
			messageId={artifact.messageId}
			savedAlertIds={artifact.savedAlertIds}
		/>
	)
}

function MessageContentBlock({
	block,
	artifact,
	isStreaming,
	sessionId,
	onActionClick,
	nextUserMessage,
	hackerMode,
	onTableFullscreenOpen,
	messageId,
	onImageClick
}: {
	block: MessageRenderBlock
	artifact?: ArtifactRecord
	isStreaming: boolean
	sessionId?: string | null
	onActionClick?: (message: string) => void
	nextUserMessage?: string
	hackerMode?: boolean
	onTableFullscreenOpen?: () => void
	messageId?: string
	onImageClick?: (url: string) => void
}) {
	if (block.type === 'action-group') {
		return <ActionButtonGroup actions={block.actions} onActionClick={onActionClick} nextUserMessage={nextUserMessage} />
	}

	if (block.type === 'markdown') {
		return (
			<ChatMarkdownRenderer
				content={block.content}
				citations={block.citations}
				isStreaming={isStreaming}
				hackerMode={hackerMode}
				onTableFullscreenOpen={onTableFullscreenOpen}
				messageId={messageId}
			/>
		)
	}

	if (block.type === 'sources') {
		return <SourcesList citations={block.citations} isStreaming={isStreaming} />
	}

	return (
		<ArtifactBlockRenderer
			block={block}
			artifact={artifact}
			isStreaming={isStreaming}
			sessionId={sessionId}
			messageId={messageId}
			onImageClick={onImageClick}
		/>
	)
}

function InlineContent({
	message,
	toolExecutions,
	isStreaming = false,
	sessionId,
	onActionClick,
	nextUserMessage,
	hackerMode,
	showToolDetails = false,
	onTableFullscreenOpen,
	onImageClick
}: {
	message: Message
	toolExecutions?: ToolExecution[]
	isStreaming?: boolean
	sessionId?: string | null
	onActionClick?: (message: string) => void
	nextUserMessage?: string
	hackerMode?: boolean
	showToolDetails?: boolean
	onTableFullscreenOpen?: () => void
	onImageClick?: (url: string) => void
}) {
	const includeFallbackArtifacts = !isStreaming
	const { artifactsById, blocks } = useMemo(
		() => parseMessageToRenderModel(message, { includeFallbackArtifacts }),
		[includeFallbackArtifacts, message]
	)

	return (
		<div className="flex flex-col gap-2.5" style={isStreaming ? { overflowAnchor: 'none' } : undefined}>
			{blocks.map((block) => (
				<div key={block.key}>
					<MessageContentBlock
						block={block}
						artifact={'artifactId' in block ? artifactsById.get(block.artifactId) : undefined}
						isStreaming={isStreaming}
						sessionId={sessionId}
						onActionClick={onActionClick}
						nextUserMessage={nextUserMessage}
						hackerMode={hackerMode}
						onTableFullscreenOpen={onTableFullscreenOpen}
						messageId={message.id}
						onImageClick={onImageClick}
					/>
				</div>
			))}

			{isStreaming && message.content ? (
				<span className="inline-block h-4 w-0.5 animate-pulse bg-(--old-blue)" />
			) : null}

			{!isStreaming && toolExecutions && toolExecutions.length > 0 ? (
				<ToolExecutionPanel toolExecutions={toolExecutions} showDetails={showToolDetails} />
			) : null}
		</div>
	)
}

function ToolExecutionPanel({
	toolExecutions,
	showDetails = false
}: {
	toolExecutions: ToolExecution[]
	showDetails?: boolean
}) {
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
					<ToolExecutionRow
						key={getRowKey(getToolExecutionKey(execution))}
						execution={execution}
						showDetails={showDetails}
					/>
				))}
			</div>
		</details>
	)
}

function ToolExecutionRow({ execution, showDetails = false }: { execution: ToolExecution; showDetails?: boolean }) {
	const [showPreview, setShowPreview] = useState(false)
	const meta = TOOL_ICONS[execution.name] || { icon: 'sparkles', color: '#919296' }
	const label = TOOL_LABELS[execution.name] || execution.name
	const hasDetails = showDetails && (execution.resultPreview?.length || execution.sqlQuery || execution.toolData)
	const parsedCost = execution.costUsd ? parseFloat(execution.costUsd) : NaN
	const premiumCostLabel = Number.isFinite(parsedCost) ? ` $${parsedCost.toFixed(3)}` : ''

	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={() => hasDetails && setShowPreview(!showPreview)}
				className="flex items-center gap-2 py-0.5 text-left"
			>
				<Icon name={meta.icon as never} height={12} width={12} className="shrink-0" style={{ color: meta.color }} />
				<span className="flex-1 text-xs text-[#555] dark:text-[#ccc]">{label}</span>
				{execution.isPremium || execution.costUsd ? (
					<span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
						Premium{premiumCostLabel}
					</span>
				) : null}
				{execution.success ? (
					<span className="text-[10px] text-green-600 dark:text-green-400">ok</span>
				) : (
					<span className="text-[10px] text-red-500">err</span>
				)}
				<span className="font-mono text-[10px] text-[#999] tabular-nums dark:text-[#666]">
					{execution.executionTimeMs}ms
				</span>
				{showDetails && execution.resultCount != null ? (
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

type ToolDataRenderer = (data: Record<string, any>) => ReactNode | null

const TOOL_DATA_RENDERERS: Record<string, ToolDataRenderer> = {
	resolve_entity: (data) => {
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
	},
	generate_chart: (data) => {
		if (!data.charts) return null
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
	},
	execute_code: (data) =>
		data.logs?.length ? (
			<pre className="mt-1 mb-1 overflow-x-auto rounded border border-[#e6e6e6] bg-[#fafafa] p-1.5 font-mono text-[10px] text-[#444] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#bbb]">
				{data.logs.join('\n')}
			</pre>
		) : null,
	load_skill: (data) => (
		<div className="mt-1 mb-1 text-[10px] text-[#444] dark:text-[#bbb]">
			<span className="font-medium">{data.skill}</span>
			{data.unlockedTools?.length > 0 ? (
				<span className="text-[#999]"> - unlocked: {data.unlockedTools.join(', ')}</span>
			) : null}
		</div>
	),
	spawn_agent: (data) => {
		if (!data.agents) return null
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
	},
	web_search: (data) => <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.citationCount} sources</span>,
	x_search: (data) => <span className="mt-1 mb-1 text-[10px] text-[#999]">{data.tweetCount} tweets</span>
}

function ToolDataView({ name, data }: { name: string; data: Record<string, any> }) {
	return TOOL_DATA_RENDERERS[name]?.(data) ?? null
}

function BranchArrows({
	info,
	onSwitch,
	disabled = false
}: {
	info: NonNullable<Message['siblingInfo']>
	onSwitch: (leafMessageId: string) => void
	disabled?: boolean
}) {
	const { currentVersion, totalVersions, siblings } = info
	const goPrev = currentVersion > 1 ? siblings[currentVersion - 2]?.leafMessageId : null
	const goNext = currentVersion < totalVersions ? siblings[currentVersion]?.leafMessageId : null
	const arrowClass =
		'rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#999] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc] dark:disabled:hover:text-[#666]'
	return (
		<div className="flex items-center gap-0.5">
			<Tooltip
				content="Previous version"
				render={
					<button
						type="button"
						disabled={disabled || !goPrev}
						onClick={() => !disabled && goPrev && onSwitch(goPrev)}
						aria-label="Previous version"
					/>
				}
				className={arrowClass}
			>
				<Icon name="chevron-left" height={14} width={14} />
			</Tooltip>
			<span className="px-0.5 text-[11px] text-[#999] tabular-nums dark:text-[#666]">
				{currentVersion}
				<span className="opacity-50">/{totalVersions}</span>
			</span>
			<Tooltip
				content="Next version"
				render={
					<button
						type="button"
						disabled={disabled || !goNext}
						onClick={() => !disabled && goNext && onSwitch(goNext)}
						aria-label="Next version"
					/>
				}
				className={arrowClass}
			>
				<Icon name="chevron-right" height={14} width={14} />
			</Tooltip>
		</div>
	)
}

export function MessageBubble({
	message,
	sessionId,
	isDraft = false,
	readOnly = false,
	isLlama = false,
	isLatestAssistant = false,
	onActionClick,
	onEditMessage,
	onBranchSwitch,
	isBranchSwitching = false,
	nextUserMessage,
	onShare,
	onTableFullscreenOpen,
	anchorId,
	anchorRef,
	anchorClassName
}: {
	message: Message
	sessionId: string | null
	isDraft?: boolean
	readOnly?: boolean
	isLlama?: boolean
	isLatestAssistant?: boolean
	onActionClick?: (message: string) => void
	onEditMessage?: (messageId: string, newText: string, original: Message) => Promise<void>
	onBranchSwitch?: (leafMessageId: string) => void
	isBranchSwitching?: boolean
	nextUserMessage?: string
	onShare?: (messageId?: string) => void
	onTableFullscreenOpen?: () => void
	anchorId?: string
	anchorRef?: RefCallback<HTMLDivElement>
	anchorClassName?: string
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [draftText, setDraftText] = useState(message.content || '')
	const hackerMode = useHackerMode()
	const handleCancelEdit = () => {
		if (isSaving) return
		setIsEditing(false)
		setDraftText(message.content || '')
	}
	const handleSaveEdit = async () => {
		const next = draftText.trim()
		if (!message.id || !next || next === message.content?.trim() || isSaving) return
		setIsSaving(true)
		try {
			await onEditMessage?.(message.id, next, message)
			setIsEditing(false)
		} catch {
			// textarea stays open with draft preserved; parent rolled back state and surfaced an error
		} finally {
			setIsSaving(false)
		}
	}
	if (message.role === 'user') {
		const isPersistedId = !!message.id && !/^(local|persisted|shared)-/.test(message.id)
		const canEdit = isPersistedId && !!onEditMessage
		const canSwitchBranch = isPersistedId && !!onBranchSwitch
		const hasControls = isPersistedId && !isDraft && !readOnly && (canEdit || canSwitchBranch)
		return (
			<div
				id={anchorId}
				ref={anchorRef}
				className={`group/msg ml-auto flex w-full max-w-[80%] flex-col items-end ${anchorClassName ?? ''}`}
			>
				<div
					className={`${isEditing ? 'w-full' : 'w-fit max-w-full'} rounded-lg rounded-tr-none px-3.5 py-2.5 wrap-break-word transition-[background-color,box-shadow] duration-150 ${
						isEditing
							? 'bg-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-[#1a1c1d] dark:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]'
							: 'bg-[#ececec] dark:bg-[#222425]'
					}`}
				>
					{message.quotedText ? (
						<div className="mb-2 border-l-2 border-black/15 py-1 pl-2.5 dark:border-white/15">
							<p className="line-clamp-3 text-[13px] text-[#666] dark:text-[#888]">{message.quotedText}</p>
						</div>
					) : null}
					{message.images && message.images.length > 0 ? (
						<div className="mb-2.5 flex flex-wrap gap-3">
							{message.images.map((image) => {
								const isImage = image.mimeType?.startsWith('image/')
								const displayName = image.originalFilename || image.filename || 'File'
								if (isImage) {
									return (
										<button
											key={`sent-image-${image.url}`}
											type="button"
											onClick={() => setPreviewImage(image.url)}
											className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg"
										>
											<img src={image.url} alt={displayName} className="h-full w-full object-cover" />
										</button>
									)
								}
								return (
									<a
										key={`sent-file-${image.url}`}
										href={image.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex h-16 items-center gap-2 rounded-lg bg-black/10 px-3 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"
									>
										<Icon name="file-text" height={18} width={18} />
										<span className="max-w-[120px] truncate text-xs">{displayName}</span>
										<Icon name="external-link" height={12} width={12} className="opacity-50" />
									</a>
								)
							})}
						</div>
					) : null}
					{isEditing ? (
						<textarea
							value={draftText}
							onChange={(event) => setDraftText(event.target.value)}
							onKeyDown={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
									event.preventDefault()
									event.stopPropagation()
									void handleSaveEdit()
									return
								}
								if (event.key === 'Escape') {
									event.preventDefault()
									event.stopPropagation()
									handleCancelEdit()
								}
							}}
							className="block w-full resize-none bg-transparent leading-snug focus:outline-none"
							rows={Math.min(10, Math.max(2, draftText.split('\n').length + 1))}
							autoFocus
						/>
					) : (
						<p className="whitespace-pre-wrap">{message.content}</p>
					)}
				</div>

				{isEditing ? (
					<div className="mt-2 flex w-full items-center gap-3">
						<p className="mr-auto text-[11px] text-[#999] dark:text-[#666]">
							{isPersistedId ? 'Saving creates a new branch' : 'This will replace your message'}
							<span className="hidden sm:inline">
								{' · '}
								<kbd className="rounded border border-black/10 bg-white/70 px-1 py-px font-mono text-[10px] text-[#666] dark:border-white/10 dark:bg-white/5 dark:text-[#888]">
									⌘↵
								</kbd>
								<span className="mx-1">save</span>
								<kbd className="rounded border border-black/10 bg-white/70 px-1 py-px font-mono text-[10px] text-[#666] dark:border-white/10 dark:bg-white/5 dark:text-[#888]">
									esc
								</kbd>
								<span className="ml-1">cancel</span>
							</span>
						</p>
						<button
							type="button"
							onClick={handleCancelEdit}
							disabled={isSaving}
							className="rounded-md px-2.5 py-1 text-[12px] text-[#666] transition-colors hover:bg-black/5 hover:text-[#222] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#999] dark:hover:bg-white/5 dark:hover:text-white"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSaveEdit}
							disabled={isSaving || !draftText.trim() || draftText.trim() === message.content?.trim()}
							className="rounded-md bg-blue-600 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
						>
							{isSaving ? 'Saving…' : 'Save'}
						</button>
					</div>
				) : hasControls ? (
					<div className="mt-1 flex items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover/msg:opacity-100 sm:focus-within:opacity-100">
						{canSwitchBranch && message.siblingInfo && message.siblingInfo.totalVersions > 1 && onBranchSwitch ? (
							<BranchArrows info={message.siblingInfo} onSwitch={onBranchSwitch} disabled={isBranchSwitching} />
						) : null}
						{canEdit ? (
							<Tooltip
								content="Edit message"
								render={
									<button
										type="button"
										onClick={() => {
											setIsEditing(true)
											setDraftText(message.content || '')
										}}
										aria-label="Edit message"
									/>
								}
								className="rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]"
							>
								<Icon name="pencil" height={14} width={14} />
							</Tooltip>
						) : null}
					</div>
				) : null}

				<ImagePreviewModal
					imageUrl={previewImage}
					onClose={() => setPreviewImage(null)}
					source="user-upload"
					sessionId={sessionId}
					messageId={message.id}
				/>
			</div>
		)
	}

	return (
		<div id={anchorId} ref={anchorRef} className={`group/msg flex flex-col gap-2.5 ${anchorClassName ?? ''}`}>
			{message.thinking ? <ThinkingPanel thinking={message.thinking} defaultOpen={isDraft} /> : null}
			<InlineContent
				message={readOnly ? { ...message, alerts: undefined } : message}
				toolExecutions={message.toolExecutions}
				isStreaming={isDraft}
				sessionId={sessionId}
				onActionClick={onActionClick}
				nextUserMessage={nextUserMessage}
				hackerMode={hackerMode}
				showToolDetails={isLlama}
				onTableFullscreenOpen={onTableFullscreenOpen}
				onImageClick={setPreviewImage}
			/>
			<ImagePreviewModal
				imageUrl={previewImage}
				onClose={() => setPreviewImage(null)}
				source="generated"
				sessionId={sessionId}
				messageId={message.id}
			/>
			{message.id && !isDraft ? (
				<ResponseControls
					messageId={message.id}
					content={message.content}
					onShare={onShare}
					sessionId={sessionId}
					readOnly={readOnly}
					messageMetadata={message.messageMetadata}
					isLatest={isLatestAssistant}
				/>
			) : null}
		</div>
	)
}

const KIND_LABELS: Record<string, string> = {
	chart: 'chart',
	multi: 'multi-chart',
	metric: 'metric',
	builder: 'chart builder',
	text: 'text',
	table: 'table',
	'unified-table': 'table',
	yields: 'yield chart',
	stablecoins: 'stablecoin chart',
	'stablecoin-asset': 'stablecoin chart',
	'advanced-tvl': 'TVL breakdown',
	'advanced-borrowed': 'borrowed chart',
	'income-statement': 'income statement',
	'unlocks-schedule': 'unlock schedule',
	'unlocks-pie': 'unlock pie',
	'llamaai-chart': 'AI chart'
}

function DashboardInlineCard({ dashboard }: { dashboard: DashboardArtifact }) {
	const { toggleDashboardPanel, isDashboardPanelOpen } = useLlamaAIChrome()
	const kindCounts: Record<string, number> = {}
	for (const item of dashboard.items) {
		const label = KIND_LABELS[item.kind] || item.kind
		kindCounts[label] = (kindCounts[label] || 0) + 1
	}
	const summary = Object.entries(kindCounts)
		.map(([label, count]) => `${count} ${label}${count > 1 ? 's' : ''}`)
		.join(' · ')

	return (
		<button
			onClick={toggleDashboardPanel}
			className="my-2 flex w-full items-center gap-3 rounded-lg border border-[#2172e5]/30 bg-[#2172e5]/5 px-3.5 py-2.5 text-left transition-all hover:border-[#2172e5]/50 hover:bg-[#2172e5]/10"
		>
			<Icon name="layout-grid" className="h-4 w-4 shrink-0 text-[#2172e5] dark:text-[#4190f7]" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-semibold text-[#2172e5] dark:text-[#4190f7]">
						{dashboard.dashboardName}
					</span>
					<span className="shrink-0 text-xs text-[#636e72] dark:text-[#8a8f98]">{dashboard.items.length} items</span>
				</div>
				<div className="truncate text-xs text-[#636e72] dark:text-[#8a8f98]">{summary}</div>
			</div>
			<Icon
				name={isDashboardPanelOpen ? 'chevron-right' : 'chevron-left'}
				className="h-4 w-4 shrink-0 text-[#636e72] dark:text-[#8a8f98]"
			/>
		</button>
	)
}
