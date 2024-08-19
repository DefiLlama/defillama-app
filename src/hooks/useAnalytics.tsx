import { useEffect } from 'react'
import { useRouter } from 'next/router'
import * as Fathom from 'fathom-client'

const PAGE_VISIT_URL = 'https://page-visit.defillama.com'

const useAnalytics = () => {
	const router = useRouter()

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') {
			Fathom.load('OANJVQNZ', {
				includedDomains: ['defillama.com', 'www.defillama.com'],
				url: '/script.js'
			})
		}

		const onRouteChangeComplete = (url: string, _: { shallow: boolean }) => {
			Fathom.trackPageview()
			const baseRoute = url.split('?')[0]
			// will trigger CORS error but don't care cuz no payload lol
			fetch(`${PAGE_VISIT_URL}/visit${baseRoute}`, { method: 'POST' }).catch(() => {})
		}

		// Record a pageview when route changes
		router.events.on('routeChangeComplete', onRouteChangeComplete)

		// Unassign event listener
		return () => {
			router.events.off('routeChangeComplete', onRouteChangeComplete)
		}
	}, [router.events])
}

export default useAnalytics
