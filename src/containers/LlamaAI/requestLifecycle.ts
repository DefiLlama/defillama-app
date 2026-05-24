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
	return Promise.race([
		settleState.promise,
		new Promise<void>((resolve) => {
			globalThis.setTimeout(resolve, timeoutMs)
		})
	])
}
