import { useEffect, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const UMAMI_READY_RETRY_INTERVAL_MS = 500
const MAX_UMAMI_READY_RETRIES = 10

export function UmamiIdentityTracker() {
	const { user } = useAuthContext()
	const lastIdentifiedIdRef = useRef<string | null>(null)
	const shouldSkipIdentify = user?.flags?.is_llama === true
	const distinctId = user?.id ?? null

	useEffect(() => {
		if (typeof window === 'undefined') return

		if (!distinctId) {
			lastIdentifiedIdRef.current = null
			return
		}

		const identifyCurrentUser = () => {
			if (shouldSkipIdentify) {
				return true
			}

			const maybeUmami = Reflect.get(window, 'umami')
			if (typeof maybeUmami !== 'object' || maybeUmami === null) return false
			const maybeIdentify = Reflect.get(maybeUmami, 'identify')
			if (typeof maybeIdentify !== 'function') return false
			if (lastIdentifiedIdRef.current === distinctId) return true

			Reflect.apply(maybeIdentify, maybeUmami, [distinctId])
			lastIdentifiedIdRef.current = distinctId
			return true
		}

		let intervalId: number | null = null
		const runIdentifyWorkflow = () => {
			if (identifyCurrentUser()) return

			// For the case when userId is already resolved, but window.umami isn't ready yet,
			// we'll keep trying to identify until succeed/retry limit
			let retryCount = 0
			intervalId = window.setInterval(() => {
				if (identifyCurrentUser()) {
					if (intervalId !== null) {
						window.clearInterval(intervalId)
						intervalId = null
					}
					return
				}

				retryCount += 1
				if (retryCount >= MAX_UMAMI_READY_RETRIES && intervalId !== null) {
					window.clearInterval(intervalId)
					intervalId = null
				}
			}, UMAMI_READY_RETRY_INTERVAL_MS)
		}

		let idleCallbackId: number | null = null
		let timeoutId: number | null = null

		if (typeof window.requestIdleCallback === 'function') {
			idleCallbackId = window.requestIdleCallback(() => {
				runIdentifyWorkflow()
			})
		} else {
			timeoutId = window.setTimeout(() => {
				runIdentifyWorkflow()
			}, 0)
		}

		return () => {
			if (idleCallbackId !== null && typeof window.cancelIdleCallback === 'function') {
				window.cancelIdleCallback(idleCallbackId)
			}
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId)
			}
			if (intervalId !== null) {
				window.clearInterval(intervalId)
			}
		}
	}, [distinctId, shouldSkipIdentify])

	return null
}
