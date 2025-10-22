import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import NProgress from 'nprogress'
import '~/tailwind.css'
import '~/nprogress.css'
import { useEffect, useState } from 'react'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { LlamaAIWelcomeModal } from '~/components/Modal/LlamaAIWelcomeModal'
import { AuthProvider } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useLlamaAIWelcome } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'

NProgress.configure({ showSpinner: false })

const client = new QueryClient()

function LlamaAIWelcomeWrapper() {
	const [dismissed, setDismissed] = useLlamaAIWelcome()
	const isClient = useIsClient()
	const { hasFeature, isSubscriptionLoading } = useSubscribe()
	const [showModal, setShowModal] = useState(false)

	useEffect(() => {
		if (dismissed) return
		if (isClient && !isSubscriptionLoading && hasFeature('llamaai')) {
			setShowModal(true)
		}
	}, [dismissed, isClient, isSubscriptionLoading, hasFeature])

	const handleClose = () => {
		setShowModal(false)
		setDismissed()
	}

	if (dismissed) return null

	return <LlamaAIWelcomeModal isOpen={showModal} onClose={handleClose} />
}

function App({ Component, pageProps }: AppProps) {
	const router = useRouter()

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.start()
		}

		router.events.on('routeChangeStart', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			router.events.off('routeChangeStart', handleRouteChange)
		}
	}, [router])

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.done()
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router])

	// Scroll restoration for complete route changes (not shallow)
	useEffect(() => {
		const handleRouteChange = (url: string, { shallow }: { shallow: boolean }) => {
			// Only restore scroll for complete route changes, not shallow ones
			if (!shallow && typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' })
			}
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router])

	return (
		<QueryClientProvider client={client}>
			<AuthProvider>
				<Component {...pageProps} />
				<LlamaAIWelcomeWrapper />
			</AuthProvider>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}

export default App
