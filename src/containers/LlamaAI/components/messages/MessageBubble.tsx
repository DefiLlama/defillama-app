import { useMemo, useState, type RefCallback } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
import { AlertArtifact, AlertArtifactLoading } from '~/containers/LlamaAI/components/AlertArtifact'
import { ChartRenderer } from '~/containers/LlamaAI/components/charts/ChartRenderer'
import { CSVExportArtifact } from '~/containers/LlamaAI/components/CSVExportArtifact'
import { ImagePreviewModal } from '~/containers/LlamaAI/components/ImagePreviewModal'
import { TextChip } from '~/containers/LlamaAI/components/input/ImageUpload'
import { ChatMarkdownRenderer, SourcesList } from '~/containers/LlamaAI/components/markdown/ChatMarkdownRenderer'
import { MarkdownExportArtifact } from '~/containers/LlamaAI/components/MarkdownExportArtifact'
import { BranchArrows } from '~/containers/LlamaAI/components/messages/BranchControls'
import { ActionButtonGroup } from '~/containers/LlamaAI/components/messages/MessageActionGroup'
import { ToolExecutionPanel } from '~/containers/LlamaAI/components/messages/ToolExecutionPanel'
import { PastedContentModal } from '~/containers/LlamaAI/components/PastedContentModal'
import { ResponseControls } from '~/containers/LlamaAI/components/ResponseControls'
import { ThinkingPanel } from '~/containers/LlamaAI/components/status/ThinkingPanel'
import {
	deriveTodosFromToolExecutions,
	TodoChecklistPanel
} from '~/containers/LlamaAI/components/status/TodoChecklistPanel'
import { useHackerMode } from '~/containers/LlamaAI/components/status/useHackerMode'
import { TrialUpgradeCard } from '~/containers/LlamaAI/components/TrialUpgradeCard'
import {
	parseMessageToRenderModel,
	type ArtifactRecord,
	type MessageRenderBlock
} from '~/containers/LlamaAI/renderModel'
import type { DashboardArtifact } from '~/containers/LlamaAI/types'
import type { Message, ToolExecution } from '~/containers/LlamaAI/types'

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
				factCheckReferences={block.factCheckReferences}
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
				<>
					<FrozenTodoChecklist
						toolExecutions={toolExecutions}
						completionReason={message.messageMetadata?.completionReason}
					/>
					<ToolExecutionPanel toolExecutions={toolExecutions} showDetails={showToolDetails} />
				</>
			) : null}

			{message.upgradeOffer ? <TrialUpgradeCard offer={message.upgradeOffer} /> : null}
		</div>
	)
}

function FrozenTodoChecklist({
	toolExecutions,
	completionReason
}: {
	toolExecutions: ToolExecution[]
	completionReason?: string
}) {
	const todos = useMemo(() => deriveTodosFromToolExecutions(toolExecutions), [toolExecutions])
	if (todos.length === 0) return null
	const interrupted = !!completionReason && completionReason !== 'natural'
	return <TodoChecklistPanel todos={todos} interrupted={interrupted} />
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
	anchorClassName,
	enterToSend = true
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
	enterToSend?: boolean
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const [pastedPreview, setPastedPreview] = useState<{ content: string; filename: string; isPasted?: boolean } | null>(
		null
	)
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
								const normalizedMime = image.mimeType?.split(';')[0].trim().toLowerCase()
								const isTextMime =
									normalizedMime === 'text/plain' || normalizedMime === 'text/markdown' || normalizedMime === 'text/csv'
								if (isTextMime) {
									const isPasted = !!image.originalFilename && /^Pasted-\d+/.test(image.originalFilename)
									return (
										<TextChip
											key={`sent-file-${image.url}`}
											name={displayName}
											sizeBytes={image.size ?? 0}
											textContent={image.textContent ?? ''}
											isPasted={isPasted}
											onOpen={async () => {
												let content = image.textContent
												if (typeof content !== 'string') {
													try {
														const res = await fetch(image.url)
														content = res.ok ? await res.text() : ''
													} catch {
														content = ''
													}
												}
												setPastedPreview({ content, filename: displayName, isPasted })
											}}
										/>
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
								if (event.key === 'Enter' && event.shiftKey !== enterToSend && !event.nativeEvent.isComposing) {
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
								{enterToSend ? (
									<kbd className="rounded border border-black/10 bg-white/70 px-1 py-px font-mono text-[10px] text-[#666] dark:border-white/10 dark:bg-white/5 dark:text-[#888]">
										Enter
									</kbd>
								) : (
									<>
										<kbd className="rounded border border-black/10 bg-white/70 px-1 py-px font-mono text-[10px] text-[#666] dark:border-white/10 dark:bg-white/5 dark:text-[#888]">
											Shift
										</kbd>
										<span className="mx-0.5">+</span>
										<kbd className="rounded border border-black/10 bg-white/70 px-1 py-px font-mono text-[10px] text-[#666] dark:border-white/10 dark:bg-white/5 dark:text-[#888]">
											Enter
										</kbd>
									</>
								)}
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
				<PastedContentModal preview={pastedPreview} onClose={() => setPastedPreview(null)} />
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
