import type {
	StreamItem,
	MarkdownItem,
	ChartItem,
	CsvItem,
	ImagesItem,
	LoadingItem,
	ResearchItem,
	ErrorItem,
	SuggestionsItem,
	MetadataItem,
	ChartConfiguration,
	UploadedImage,
	Suggestion
} from '../types'

/**
 * Buffer for streaming items with throttled updates.
 * Batches token updates to reduce re-renders during streaming.
 *
 * Key design decisions:
 * - 50ms flush interval balances real-time feel with performance
 * - Markdown content accumulates in a single item (stable ID)
 * - Non-token items (charts, errors, etc.) emit immediately
 * - Flush can be called manually on stop/complete
 * - Transient items (loading, research) use stable internal IDs to avoid drift
 *   when server-provided message_id arrives mid-stream
 */
export class ItemStreamBuffer {
	private items: Map<string, StreamItem> = new Map()
	private markdownContent: string = ''
	private markdownId: string
	private citations: string[] = []
	private flushTimeout: ReturnType<typeof setTimeout> | null = null
	private onEmit: ((items: StreamItem[]) => void) | null = null

	// Stable IDs for transient items - these don't change when server messageId arrives
	// This prevents stale loading/research items when message_id event changes the ID mid-stream
	private static readonly LOADING_ID = 'stream-loading'
	private static readonly RESEARCH_ID = 'stream-research'
	private static readonly FLUSH_INTERVAL = 50 // ms

	constructor(messageId: string, initialMarkdown?: string) {
		this.markdownId = `${messageId}-markdown`
		if (initialMarkdown) {
			this.markdownContent = initialMarkdown
		}
	}

	/**
	 * Set the callback for emitting items.
	 * If there's initial content, emit immediately so UI has it before new tokens arrive.
	 */
	setEmitCallback(callback: (items: StreamItem[]) => void): void {
		this.onEmit = callback
		// If we have initial content, emit immediately so UI doesn't start empty
		if (this.markdownContent) {
			this.emitNow()
		}
	}

	/**
	 * Add a token to the markdown content.
	 * Tokens are batched and emitted on flush.
	 */
	addToken(token: string): void {
		this.markdownContent += token
		this.scheduleFlush()
	}

	/**
	 * Update citations (attached to markdown item).
	 */
	setCitations(citations: string[]): void {
		this.citations = citations
		this.scheduleFlush()
	}

	/**
	 * Add a chart item.
	 */
	addChart(chart: ChartConfiguration, chartData: any[] | Record<string, any[]>): void {
		const item: ChartItem = {
			type: 'chart',
			id: chart.id,
			chart,
			chartData
		}
		this.items.set(item.id, item)
		this.emitNow()
	}

	/**
	 * Add a CSV export item.
	 */
	addCsv(csv: { id: string; title: string; url: string; rowCount: number; filename: string }): void {
		const item: CsvItem = {
			type: 'csv',
			...csv
		}
		this.items.set(item.id, item)
		this.emitNow()
	}

	/**
	 * Add response images.
	 */
	addImages(images: UploadedImage[], messageId: string): void {
		const item: ImagesItem = {
			type: 'images',
			id: `${messageId}-images`,
			images
		}
		this.items.set(item.id, item)
		this.emitNow()
	}

	/**
	 * Set loading state.
	 * Uses stable internal ID to avoid stale items when messageId changes mid-stream.
	 */
	setLoading(stage: string, message?: string): void {
		const item: LoadingItem = {
			type: 'loading',
			id: ItemStreamBuffer.LOADING_ID,
			stage,
			message
		}
		this.items.set(ItemStreamBuffer.LOADING_ID, item)
		this.emitNow()
	}

	/**
	 * Remove loading state.
	 */
	clearLoading(): void {
		this.items.delete(ItemStreamBuffer.LOADING_ID)
		this.emitNow()
	}

	/**
	 * Set research progress state.
	 * Uses stable internal ID to avoid stale items when messageId changes mid-stream.
	 */
	setResearch(research: Omit<ResearchItem, 'type' | 'id'>): void {
		const item: ResearchItem = {
			type: 'research',
			id: ItemStreamBuffer.RESEARCH_ID,
			...research
		}
		this.items.set(ItemStreamBuffer.RESEARCH_ID, item)
		this.emitNow()
	}

	/**
	 * Clear research state.
	 */
	clearResearch(): void {
		this.items.delete(ItemStreamBuffer.RESEARCH_ID)
		this.emitNow()
	}

	/**
	 * Add an error item.
	 */
	addError(message: string, code?: string, recoverable?: boolean, messageId?: string): void {
		const id = `${messageId || 'stream'}-error`
		const item: ErrorItem = {
			type: 'error',
			id,
			message,
			code,
			recoverable
		}
		this.items.set(id, item)
		this.emitNow()
	}

	/**
	 * Set suggestions.
	 */
	setSuggestions(suggestions: Suggestion[], messageId: string): void {
		const item: SuggestionsItem = {
			type: 'suggestions',
			id: `${messageId}-suggestions`,
			suggestions
		}
		this.items.set(item.id, item)
		this.emitNow()
	}

	/**
	 * Set metadata.
	 */
	setMetadata(metadata: any, messageId: string): void {
		const item: MetadataItem = {
			type: 'metadata',
			id: `${messageId}-metadata`,
			metadata
		}
		this.items.set(item.id, item)
		// Metadata doesn't need immediate emit
		this.scheduleFlush()
	}

	/**
	 * Schedule a flush if not already scheduled.
	 */
	private scheduleFlush(): void {
		if (this.flushTimeout === null) {
			this.flushTimeout = setTimeout(() => {
				this.flush()
			}, ItemStreamBuffer.FLUSH_INTERVAL)
		}
	}

	/**
	 * Emit items immediately (for non-token events).
	 */
	private emitNow(): void {
		if (this.flushTimeout !== null) {
			clearTimeout(this.flushTimeout)
			this.flushTimeout = null
		}
		this.flush()
	}

	/**
	 * Flush buffered content and emit all items.
	 */
	flush(): void {
		this.flushTimeout = null

		const allItems: StreamItem[] = []

		// Add markdown item if there's content
		if (this.markdownContent) {
			const markdownItem: MarkdownItem = {
				type: 'markdown',
				id: this.markdownId,
				text: this.markdownContent,
				citations: this.citations.length > 0 ? this.citations : undefined
			}
			allItems.push(markdownItem)
		}

		// Add all other items in insertion order
		for (const item of this.items.values()) {
			allItems.push(item)
		}

		if (this.onEmit && allItems.length > 0) {
			this.onEmit(allItems)
		}
	}

	/**
	 * Get current items without emitting.
	 */
	getItems(): StreamItem[] {
		const allItems: StreamItem[] = []

		if (this.markdownContent) {
			const markdownItem: MarkdownItem = {
				type: 'markdown',
				id: this.markdownId,
				text: this.markdownContent,
				citations: this.citations.length > 0 ? this.citations : undefined
			}
			allItems.push(markdownItem)
		}

		for (const item of this.items.values()) {
			allItems.push(item)
		}

		return allItems
	}

	/**
	 * Get the accumulated markdown content.
	 */
	getMarkdownContent(): string {
		return this.markdownContent
	}

	/**
	 * Check if there's any content.
	 */
	hasContent(): boolean {
		return this.markdownContent.trim().length > 0 || this.items.size > 0
	}

	/**
	 * Get items suitable for committing to a message (removes transient states).
	 */
	getCommittableItems(): StreamItem[] {
		const items = this.getItems()
		// Remove loading and research states - they're transient
		return items.filter((item) => item.type !== 'loading' && item.type !== 'research')
	}

	/**
	 * Clear the buffer and cancel any pending flush.
	 */
	clear(): void {
		if (this.flushTimeout !== null) {
			clearTimeout(this.flushTimeout)
			this.flushTimeout = null
		}
		this.items.clear()
		this.markdownContent = ''
		this.citations = []
	}

	/**
	 * Destroy the buffer.
	 */
	destroy(): void {
		this.clear()
		this.onEmit = null
	}
}
