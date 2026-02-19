import { useEffect, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const UMAMI_READY_RETRY_INTERVAL_MS = 500
const MAX_UMAMI_READY_RETRIES = 10

export function UmamiIdentityTracker() {
	const { user } = useAuthContext()
	const lastIdentifiedIdRef = useRef<string | null>(null)
	const distinctId = user?.id ?? null

	useEffect(() => {
		if (typeof window === 'undefined') return

		if (!distinctId) {
			lastIdentifiedIdRef.current = null
			return
		}

		const identifyCurrentUser = () => {
			const maybeUmami = Reflect.get(window, 'umami')
			if (typeof maybeUmami !== 'object' || maybeUmami === null) return false
			const maybeIdentify = Reflect.get(maybeUmami, 'identify')
			if (typeof maybeIdentify !== 'function') return false
			if (lastIdentifiedIdRef.current === distinctId) return true

			maybeIdentify(distinctId)
			lastIdentifiedIdRef.current = distinctId
			return true
		}

		if (identifyCurrentUser()) return

		// For the case when userId is already resolved, but window.umami isn't ready yet,
		// we'll keep trying to identify until succeed/retry limit
		let retryCount = 0
		const intervalId = window.setInterval(() => {
			if (identifyCurrentUser()) {
				window.clearInterval(intervalId)
				return
			}

			retryCount += 1
			if (retryCount >= MAX_UMAMI_READY_RETRIES) {
				window.clearInterval(intervalId)
			}
		}, UMAMI_READY_RETRY_INTERVAL_MS)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [distinctId])

	return null
}
