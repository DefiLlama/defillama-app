import type { RefObject } from 'react'
import { isTemporaryConnectivityError } from '~/containers/LlamaAI/connectionErrors'
import type { AgenticSSECallbacks } from '~/containers/LlamaAI/fetchAgenticResponse'
import type { SessionId } from '~/containers/LlamaAI/ids'
import {
	beginRequest,
	completeRequest,
	createRequestSettleState,
	isActiveRequest,
	type RequestKind,
	type RequestSettleState
} from '~/containers/LlamaAI/requestLifecycle'
import type { RateLimitDetails } from '~/containers/LlamaAI/streamState'
import type { UpgradeOffer } from '~/containers/LlamaAI/types'

export type AgenticRequestMode = 'prompt' | 'edit' | 'resume' | 'replay'

export interface UsageLimitError extends Error {
	code?: 'USAGE_LIMIT_EXCEEDED' | UpgradeOffer['code']
	details?: Partial<RateLimitDetails>
	upgradeUrl?: string
}

export type FreeLimitError = UsageLimitError & { code: UpgradeOffer['code'] }

export type AgenticRequestErrorKind = 'abort' | 'free-limit' | 'usage-limit' | 'temporary-connectivity' | 'failure'

export interface ClassifiedAgenticRequestError {
	kind: AgenticRequestErrorKind
	error: UsageLimitError
}

const FREE_LIMIT_CODES = ['FREE_QUESTION_LIMIT', 'FREE_FORM_LIMIT', 'FREE_DAILY_LIMIT'] as const

export function isFreeLimitError(error: UsageLimitError | null | undefined): error is FreeLimitError {
	return !!error?.code && (FREE_LIMIT_CODES as readonly string[]).includes(error.code)
}

function toUsageLimitError(error: unknown): UsageLimitError {
	if (error instanceof Error) return error as UsageLimitError
	return new Error(String(error)) as UsageLimitError
}

export function classifyAgenticRequestError(error: unknown, signal: AbortSignal): ClassifiedAgenticRequestError {
	const requestError = toUsageLimitError(error)
	if (signal.aborted || requestError.name === 'AbortError') return { kind: 'abort', error: requestError }
	if (isFreeLimitError(requestError)) return { kind: 'free-limit', error: requestError }
	if (requestError.code === 'USAGE_LIMIT_EXCEEDED') return { kind: 'usage-limit', error: requestError }
	if (isTemporaryConnectivityError(requestError)) return { kind: 'temporary-connectivity', error: requestError }
	return { kind: 'failure', error: requestError }
}

export interface RunAgenticRequestContext {
	mode: AgenticRequestMode
	requestId: number
	controller: AbortController
	signal: AbortSignal
	callbacks: AgenticSSECallbacks
	eventCounter: { count: number }
}

interface RunAgenticRequestParams {
	mode: AgenticRequestMode
	sessionId: SessionId | null
	requestKind: RequestKind
	activeRequestIdRef: RefObject<number>
	activeRequestKindRef: RefObject<RequestKind>
	activeSessionIdRef: RefObject<string | null>
	abortControllerRef: RefObject<AbortController | null>
	activeRequestSettleRef: RefObject<RequestSettleState>
	createCallbacks: (context: Omit<RunAgenticRequestContext, 'callbacks'>) => AgenticSSECallbacks
	execute: (context: RunAgenticRequestContext) => Promise<void>
	onSuccess?: (context: RunAgenticRequestContext) => Promise<void> | void
	onError?: (classified: ClassifiedAgenticRequestError, context: RunAgenticRequestContext) => Promise<void> | void
	onFinally?: (context: RunAgenticRequestContext) => void
	detached?: boolean
	initialEventCount?: number
}

export async function runAgenticRequest({
	mode,
	sessionId,
	requestKind,
	activeRequestIdRef,
	activeRequestKindRef,
	activeSessionIdRef,
	abortControllerRef,
	activeRequestSettleRef,
	createCallbacks,
	execute,
	onSuccess,
	onError,
	onFinally,
	detached,
	initialEventCount = 0
}: RunAgenticRequestParams): Promise<RunAgenticRequestContext> {
	const requestId = beginRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestKind, sessionId)
	const controller = new AbortController()
	abortControllerRef.current = controller
	const settleState = createRequestSettleState(requestId)
	activeRequestSettleRef.current = settleState
	const eventCounter = { count: initialEventCount }
	// Callback creation happens after the request id is active so every SSE handler
	// can share the same stale-request guard.
	const contextWithoutCallbacks = {
		mode,
		requestId,
		controller,
		signal: controller.signal,
		eventCounter
	}
	const context: RunAgenticRequestContext = {
		...contextWithoutCallbacks,
		callbacks: createCallbacks(contextWithoutCallbacks)
	}

	const operation = (async () => {
		try {
			await execute(context)
			await onSuccess?.(context)
		} catch (error) {
			if (!onError) throw error
			await onError(classifyAgenticRequestError(error, controller.signal), context)
		} finally {
			// A newer request may have already replaced the active controller; never
			// clear refs owned by that newer request.
			if (abortControllerRef.current === controller) {
				abortControllerRef.current = null
			}
			if (isActiveRequest(activeRequestIdRef, requestId)) {
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			}
			settleState.resolve()
			if (activeRequestSettleRef.current?.requestId === requestId) {
				activeRequestSettleRef.current = null
			}
			onFinally?.(context)
		}
	})()

	if (!detached) {
		await operation
	}

	return context
}
