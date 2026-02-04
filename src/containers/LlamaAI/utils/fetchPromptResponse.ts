import { MCP_SERVER } from '~/constants'
import { handleSimpleFetchResponse } from '~/utils/async'
import type { StreamItem } from '../types'
import { ItemStreamBuffer } from './itemStreamBuffer'

/**
 * Server-Side Improvements for Frontend Performance
 * =================================================
 *
 * Current Architecture:
 * - Server sends discrete SSE events: token, charts, citations, suggestions, etc.
 * - Frontend uses ItemStreamBuffer to assemble these into a unified `items[]` array
 * - This requires client-side iteration, grouping, and normalization for each event type
 *
 * Recommended Server Changes:
 *
 * 1. NATIVE ITEMS-BASED SSE FORMAT
 *    Instead of: { type: 'token', content: '...' }, { type: 'charts', charts: [...] }
 *    Send:       { type: 'items', items: StreamItem[] }
 *
 *    Server maintains the items array and sends deltas or full snapshots.
 *    Frontend simply does: setStreamingItems(data.items) — no buffer needed.
 *
 * 2. PRE-RESOLVED ARTIFACT REFERENCES
 *    Instead of sending [CHART:id] placeholders in markdown + separate chart events,
 *    server injects chart items at the correct position in the items array.
 *    Eliminates O(n) placeholder parsing in MarkdownRenderer.
 *
 * 3. BATCH MULTIPLE EVENTS
 *    Server batches related events (e.g., chart + chartData + loading clear)
 *    into a single SSE message to reduce network overhead and render cycles.
 *
 * 4. CONSISTENT ITEM FORMAT
 *    Normalize suggestion formats server-side:
 *    Always send: { label, action?, params? }
 *    Instead of: { title, toolName, arguments } or { label, action, params } or strings
 *    Eliminates frontend normalization in setSuggestions().
 *
 * 5. MESSAGE ID UPFRONT
 *    Send message_id in the first SSE event (or HTTP response headers)
 *    instead of mid-stream. Eliminates ID instability during streaming.
 *
 * 6. ITEMS DELTA MODE (Advanced)
 *    For large responses, send item deltas: { op: 'append', item: {...} }
 *    or { op: 'update', id: '...', patch: {...} }
 *    Reduces payload size after initial items are established.
 *
 * Benefits:
 * - Eliminate ItemStreamBuffer class entirely (~320 lines)
 * - Reduce CPU usage during streaming (no client-side assembly)
 * - Simplify error handling (server owns item state)
 * - Enable server-side persistence of items format for faster restore
 */

// Progress callback type for progress/error/reset events only
interface ProgressData {
	type: 'progress' | 'error' | 'reset'
	content: string
	stage?: string
	researchProgress?: {
		iteration: number
		totalIterations: number
		phase: string
		dimensionsCovered: string[]
		dimensionsPending: string[]
		discoveries: string[]
		toolsExecuted: number
	}
}

interface FetchPromptResponseParams {
	prompt?: string
	userQuestion: string
	timezone?: string
	/** Called for progress messages, errors, and reset events */
	onProgress?: (data: ProgressData) => void
	/** Items-based callback - receives the full items array on each update */
	onItems?: (items: StreamItem[]) => void
	/** Called when session ID is received from server */
	onSessionId?: (sessionId: string) => void
	/** Called when title is received from server */
	onTitle?: (title: string) => void
	/** Called when message ID is received from server */
	onMessageId?: (messageId: string) => void
	abortSignal?: AbortSignal
	sessionId?: string | null
	suggestionContext?: any
	preResolvedEntities?: Array<{ term: string; slug: string }>
	mode: 'auto' | 'sql_only'
	forceIntent?: 'comprehensive_report'
	authorizedFetch: any
	images?: Array<{ data: string; mimeType: string; filename?: string }>
	resume?: boolean
	/** Initial markdown content for stream resumption - ensures continuity when reconnecting */
	initialContent?: string
}

export async function fetchPromptResponse({
	prompt,
	userQuestion,
	timezone,
	onProgress,
	onItems,
	onSessionId,
	onTitle,
	onMessageId,
	abortSignal,
	sessionId,
	suggestionContext,
	preResolvedEntities,
	mode,
	forceIntent,
	authorizedFetch,
	images,
	resume,
	initialContent
}: FetchPromptResponseParams) {
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

	// Generate a temporary message ID for item IDs (will be replaced by server-provided ID)
	let messageId = `msg-${Date.now()}`

	// Create item stream buffer for batched updates
	// Pass initialContent for stream resumption - ensures continuity when reconnecting
	const itemBuffer = new ItemStreamBuffer(messageId, initialContent)

	// Set up the emit callback
	if (onItems) {
		itemBuffer.setEmitCallback(onItems)
	}

	try {
		const requestBody: any = {
			message: userQuestion,
			stream: true,
			mode: mode,
			timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
		}

		if (resume) {
			requestBody.resume = true
		}

		if (sessionId) {
			requestBody.sessionId = sessionId
		} else {
			requestBody.createNewSession = true
		}

		if (suggestionContext) {
			requestBody.suggestionContext = suggestionContext
		}

		if (preResolvedEntities) {
			requestBody.preResolvedEntities = preResolvedEntities
		}

		if (forceIntent) {
			requestBody.forceIntent = forceIntent
		}

		if (images && images.length > 0) {
			requestBody.images = images
		}

		const response = await authorizedFetch(`${MCP_SERVER}/chatbot-agent`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody),
			signal: abortSignal
		}).then(async (res: Response) => {
			if (res.status === 403) {
				const errorData = await res.json()
				if (errorData.code === 'USAGE_LIMIT_EXCEEDED') {
					throw errorData
				}
			}
			return handleSimpleFetchResponse(res)
		})

		if (!response.ok) {
			throw new Error(`HTTP error status: ${response.status}`)
		}

		if (!response.body) {
			throw new Error('No response body')
		}

		reader = response.body.getReader()
		const decoder = new TextDecoder()
		let lineBuffer = ''

		while (true) {
			if (abortSignal?.aborted) {
				throw new Error('Request aborted')
			}

			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })

			lineBuffer += chunk

			const lines = lineBuffer.split('\n')

			if (lines.length > 0 && !chunk.endsWith('\n')) {
				lineBuffer = lines.pop() || ''
			} else {
				lineBuffer = ''
			}

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const jsonStr = line.slice(6)
					try {
						const data = JSON.parse(jsonStr)

						if (data.type === 'token') {
							// Add token to item buffer (batched)
							itemBuffer.addToken(data.content)
						} else if (data.type === 'message_id') {
							messageId = data.messageId

							// Notify about message ID
							if (onMessageId && !abortSignal?.aborted) {
								onMessageId(data.messageId)
							}
						} else if (data.type === 'progress') {
							// Handle progress as loading or research item
							// Uses stable internal IDs to avoid stale items when message_id changes mid-stream
							if (!abortSignal?.aborted) {
								if (data.researchProgress) {
									// Research mode progress
									const rp = data.researchProgress
									itemBuffer.setResearch({
										isActive: true,
										startTime: Date.now(),
										currentIteration: rp.iteration,
										totalIterations: rp.totalIterations,
										phase: rp.phase as 'planning' | 'fetching' | 'analyzing' | 'synthesizing',
										dimensionsCovered: rp.dimensionsCovered || [],
										dimensionsPending: rp.dimensionsPending || [],
										discoveries: rp.discoveries || [],
										toolsExecuted: rp.toolsExecuted || 0
									})
								} else {
									// Regular loading progress
									itemBuffer.setLoading(data.stage || 'processing', data.content)
								}
							}

							// Call onProgress for progress message display
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'progress',
									content: data.content,
									stage: data.stage,
									researchProgress: data.researchProgress
								})
							}
						} else if (data.type === 'session') {
							// Notify about session ID (not an item - metadata)
							if (onSessionId && !abortSignal?.aborted) {
								onSessionId(data.sessionId)
							}
						} else if (data.type === 'metadata') {
							// Add metadata item
							itemBuffer.setMetadata(data.metadata, messageId)
						} else if (data.type === 'suggestions') {
							// Add suggestions item
							// Normalize suggestions: backend may send { title, toolName, arguments } or { label, action, params } or strings
							if (data.suggestions?.length) {
								itemBuffer.setSuggestions(
									data.suggestions.map((s: any) => {
										if (typeof s === 'string') return { label: s }
										// Normalize various backend formats to { label, action?, params? }
										return {
											label: s.label || s.title || s.text || '',
											action: s.action || s.toolName || s.description,
											params: s.params || s.arguments
										}
									}),
									messageId
								)
							}
						} else if (data.type === 'charts') {
							// Add chart items
							// For object-shaped chartData, use specific chart's data if available,
							// otherwise use the whole object (some charts need multiple data keys)
							if (data.charts?.length) {
								for (const chart of data.charts) {
									const cData = Array.isArray(data.chartData)
										? data.chartData
										: data.chartData?.[chart.id] || data.chartData || []
									itemBuffer.addChart(chart, cData)
								}
							}

							// Clear loading state when charts arrive
							itemBuffer.clearLoading()
						} else if (data.type === 'citations') {
							// Update citations on markdown item
							itemBuffer.setCitations(data.citations || [])
						} else if (data.type === 'csv_export') {
							// Add CSV items
							if (data.exports?.length) {
								for (const csv of data.exports) {
									itemBuffer.addCsv(csv)
								}
							}
						} else if (data.type === 'images') {
							// Add images item
							if (data.images?.length) {
								itemBuffer.addImages(data.images, messageId)
							}
						} else if (data.type === 'error') {
							// Add error item
							itemBuffer.addError(data.content, data.code, data.recoverable, messageId)

							// Call onProgress for error display
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'error', content: data.content })
							}
						} else if (data.type === 'title') {
							// Notify about title (not an item - metadata)
							if (onTitle && !abortSignal?.aborted) {
								onTitle(data.content)
							}
						} else if (data.type === 'reset') {
							// Call onProgress for reset message display
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'reset',
									content: data.content || 'Retrying...'
								})
							}
						}
					} catch (e) {
						console.log('SSE JSON parse error:', e)
					}
				}
			}
		}

		// Final flush to ensure all buffered content is emitted
		itemBuffer.flush()

		// Clear transient states (loading, research)
		itemBuffer.clearLoading()
		itemBuffer.clearResearch()

		// Get final items for return value
		const finalItems = itemBuffer.getCommittableItems()

		return {
			prompt: prompt ?? userQuestion,
			items: finalItems
		}
	} catch (error: any) {
		// Clean up buffer on error
		itemBuffer.destroy()

		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch {}
		}
		if (error?.code === 'USAGE_LIMIT_EXCEEDED') {
			throw error
		}
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch prompt response')
	} finally {
		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch {}
		}
	}
}
