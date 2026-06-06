import type { RefObject } from 'react'

export type RequestKind = 'prompt' | 'resume' | 'restore' | 'pagination' | 'branch' | 'idle'

export type RequestSettleState = {
	requestId: number
	promise: Promise<void>
	resolve: () => void
} | null

export function beginRequest(
	activeRequestIdRef: RefObject<number>,
	activeRequestKindRef: RefObject<RequestKind>,
	activeSessionIdRef: RefObject<string | null>,
	kind: RequestKind,
	sessionId: string | null
) {
	// Incrementing the id invalidates every callback still held by older streams.
	const requestId = activeRequestIdRef.current + 1
	activeRequestIdRef.current = requestId
	activeRequestKindRef.current = kind
	activeSessionIdRef.current = sessionId
	return requestId
}

export function isActiveRequest(activeRequestIdRef: RefObject<number>, requestId: number) {
	return activeRequestIdRef.current === requestId
}

export function completeRequest(
	activeRequestIdRef: RefObject<number>,
	activeRequestKindRef: RefObject<RequestKind>,
	activeSessionIdRef: RefObject<string | null>,
	requestId: number
) {
	// Only the request that still owns the active id may clear shared lifecycle refs.
	if (!isActiveRequest(activeRequestIdRef, requestId)) return
	activeRequestKindRef.current = 'idle'
	activeSessionIdRef.current = null
}

export function createRequestSettleState(requestId: number): Exclude<RequestSettleState, null> {
	let resolve = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	return { requestId, promise, resolve }
}

export function waitForRequestSettle(settleState: Exclude<RequestSettleState, null>, timeoutMs = 5000) {
	let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null
	// Abort callers should not hang forever if a fetch never reaches its finally block.
	return Promise.race([
		settleState.promise,
		new Promise<void>((resolve) => {
			timeoutId = globalThis.setTimeout(resolve, timeoutMs)
		})
	]).finally(() => {
		if (timeoutId !== null) globalThis.clearTimeout(timeoutId)
	})
}
