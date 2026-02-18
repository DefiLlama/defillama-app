import { useEffect, useRef } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const UMAMI_READY_RETRY_INTERVAL_MS = 500
const MAX_UMAMI_READY_RETRIES = 120

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
			if (!window.umami?.identify) return false
			if (lastIdentifiedIdRef.current === distinctId) return true

			window.umami.identify(distinctId)
			lastIdentifiedIdRef.current = distinctId
			return true
		}

		if (identifyCurrentUser()) return

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
