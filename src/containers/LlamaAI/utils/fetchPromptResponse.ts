import { MCP_SERVER } from '~/constants'
import { handleSimpleFetchResponse } from '~/utils/async'
import type { UploadedImage } from '../types'

export interface FetchPromptResponseParams {
	prompt?: string
	userQuestion: string
	timezone?: string
	onProgress?: (data: {
		type:
			| 'token'
			| 'progress'
			| 'session'
			| 'inline_suggestions'
			| 'suggestions'
			| 'charts'
			| 'citations'
			| 'error'
			| 'title'
			| 'message_id'
			| 'reset'
			| 'csv_export'
			| 'images'
		content: string
		stage?: string
		sessionId?: string
		inlineSuggestions?: string
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
		citations?: string[]
		title?: string
		messageId?: string
		csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
		images?: UploadedImage[]
		researchProgress?: {
			iteration: number
			totalIterations: number
			phase: string
			dimensionsCovered: string[]
			dimensionsPending: string[]
			discoveries: string[]
			toolsExecuted: number
		}
	}) => void
	abortSignal?: AbortSignal
	sessionId?: string | null
	suggestionContext?: any
	preResolvedEntities?: Array<{ term: string; slug: string }>
	mode: 'auto' | 'sql_only'
	forceIntent?: 'comprehensive_report'
	authorizedFetch: any
	images?: Array<{ data: string; mimeType: string; filename?: string }>
	resume?: boolean
}

export async function fetchPromptResponse({
	prompt,
	userQuestion,
	timezone,
	onProgress,
	abortSignal,
	sessionId,
	suggestionContext,
	preResolvedEntities,
	mode,
	forceIntent,
	authorizedFetch,
	images,
	resume
}: FetchPromptResponseParams) {
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

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
		let fullResponse = ''
		let metadata = null
		let inlineSuggestions = null
		let suggestions = null
		let charts = null
		let chartData = null
		let citations = null
		let csvExports = null
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
							fullResponse += data.content
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'token', content: data.content })
							}
						} else if (data.type === 'message_id') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'message_id', content: data.content, messageId: data.messageId })
							}
						} else if (data.type === 'progress') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'progress',
									content: data.content,
									stage: data.stage,
									researchProgress: data.researchProgress
								})
							}
						} else if (data.type === 'session') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'session', content: '', sessionId: data.sessionId })
							}
						} else if (data.type === 'metadata') {
							metadata = data.metadata
						} else if (data.type === 'inline_suggestions') {
							inlineSuggestions = data.content
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'inline_suggestions', content: data.content, inlineSuggestions: data.content })
							}
						} else if (data.type === 'suggestions') {
							suggestions = data.suggestions
						} else if (data.type === 'charts') {
							charts = data.charts
							chartData = data.chartData
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'charts',
									content: `Generated ${data.charts?.length || 0} chart(s)`,
									charts: data.charts,
									chartData: data.chartData
								})
							}
						} else if (data.type === 'citations') {
							citations = data.citations
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'citations',
									content: '',
									citations: data.citations
								})
							}
						} else if (data.type === 'csv_export') {
							csvExports = data.exports
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'csv_export',
									content: `Generated ${data.exports?.length || 0} CSV export(s)`,
									csvExports: data.exports
								})
							}
						} else if (data.type === 'images') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'images',
									content: '',
									images: data.images
								})
							}
						} else if (data.type === 'error') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'error', content: data.content })
							}
						} else if (data.type === 'title') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'title', content: data.content, title: data.content })
							}
						} else if (data.type === 'reset') {
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

		return {
			prompt: prompt ?? userQuestion,
			response: {
				answer: fullResponse,
				metadata,
				inlineSuggestions,
				suggestions,
				charts,
				chartData,
				citations,
				csvExports
			}
		}
	} catch (error: any) {
		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch (releaseError) {}
		}
		if (error?.code === 'USAGE_LIMIT_EXCEEDED') {
			throw error
		}
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch prompt response')
	} finally {
		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch (releaseError) {}
		}
	}
}
