import { useEffect } from 'react'
import { checkParentAuth } from '~/utils/checkParentAuth'

const SESSION_KEY = 'ir-parent-auth-tracked'
const UMAMI_RETRY_INTERVAL_MS = 500
const MAX_UMAMI_RETRIES = 10

export function useParentAuthTracker() {
	useEffect(() => {
		if (typeof window === 'undefined') return
		if (sessionStorage.getItem(SESSION_KEY)) return

		let cancelled = false
		let intervalId: number | null = null

		checkParentAuth().then((user) => {
			if (cancelled || !user) return

			sessionStorage.setItem(SESSION_KEY, '1')

			const trackVisit = (): boolean => {
				const umami = window.umami
				if (!umami) return false

				umami.identify(user.id ?? 'unknown')
				umami.track('ir-authenticated-visit', {
					userId: user.id,
					email: user.email,
					hasActiveSubscription: user.hasActiveSubscription
				})
				return true
			}

			if (trackVisit()) return

			let retries = 0
			intervalId = window.setInterval(() => {
				if (trackVisit() || ++retries >= MAX_UMAMI_RETRIES) {
					if (intervalId !== null) {
						window.clearInterval(intervalId)
						intervalId = null
					}
				}
			}, UMAMI_RETRY_INTERVAL_MS)
		})

		return () => {
			cancelled = true
			if (intervalId !== null) {
				window.clearInterval(intervalId)
			}
		}
	}, [])
}
