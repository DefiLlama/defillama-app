import { useEffect } from 'react'
import { useRouter } from 'next/router'
import * as Fathom from 'fathom-client'

export const useAnalytics = () => {
	const router = useRouter()

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') {
			Fathom.load('OANJVQNZ', {
				includedDomains: ['defillama.com', 'www.defillama.com'],
				url: '/script.js'
			})
		}

		const onRouteChangeComplete = (url: string, options: { shallow: boolean }) => {
			if (!options.shallow) {
				Fathom.trackPageview()
			}
		}

		// Record a pageview when route changes
		router.events.on('routeChangeComplete', onRouteChangeComplete)

		// Unassign event listener
		return () => {
			router.events.off('routeChangeComplete', onRouteChangeComplete)
		}
	}, [router.events])
}
