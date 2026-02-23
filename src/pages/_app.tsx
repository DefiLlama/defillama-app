import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Router, { useRouter } from 'next/router'
import '~/tailwind.css'
import '~/nprogress.css'
import Script from 'next/script'
import NProgress from 'nprogress'
import { useEffect, useRef } from 'react'
import { UmamiIdentityTracker } from '~/components/analytics/UmamiIdentityTracker'
import { LlamaAIFloatingButton } from '~/components/LlamaAIFloatingButton'
import { UserSettingsSync } from '~/components/UserSettingsSync'
import { AuthProvider, useAuthContext } from '~/containers/Subscribtion/auth'

NProgress.configure({ showSpinner: false })

const CHUNK_LOAD_ERROR_KEY = 'chunk-load-error-reload'

const isChunkLoadError = (error: unknown) => {
	if (!error) return false
	if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ChunkLoadError') {
		return true
	}

	const message = String((error as { message?: string })?.message ?? error)
	return (
		message.includes('ChunkLoadError') || message.includes('Loading chunk') || message.includes('Failed to load chunk')
	)
}

const client = new QueryClient()

function App({ Component, pageProps }: AppProps) {
	const router = useRouter()
	const reloadInProgressRef = useRef(false)

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.start()
		}

		Router.events.on('routeChangeStart', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			Router.events.off('routeChangeStart', handleRouteChange)
		}
	}, [])

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.done()
			reloadInProgressRef.current = false
		}

		Router.events.on('routeChangeComplete', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			Router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [])

	useEffect(() => {
		const reloadOnce = (url?: string) => {
			if (typeof window === 'undefined') return
			if (reloadInProgressRef.current) return

			const targetUrl = url ?? window.location.href
			const lastReloadUrl = sessionStorage.getItem(CHUNK_LOAD_ERROR_KEY)
			if (lastReloadUrl === targetUrl) return

			reloadInProgressRef.current = true
			sessionStorage.setItem(CHUNK_LOAD_ERROR_KEY, targetUrl)
			if (url) {
				window.location.assign(url)
			} else {
				window.location.reload()
			}
		}

		const handleRouteChangeError = (error: unknown, url: string) => {
			NProgress.done()
			if (!isChunkLoadError(error)) return
			reloadOnce(url)
		}

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			if (!isChunkLoadError(event.reason)) return
			reloadOnce()
		}

		const handleError = (event: ErrorEvent) => {
			if (!isChunkLoadError(event.error ?? event.message)) return
			reloadOnce()
		}

		Router.events.on('routeChangeError', handleRouteChangeError)
		window.addEventListener('unhandledrejection', handleUnhandledRejection)
		window.addEventListener('error', handleError)

		return () => {
			Router.events.off('routeChangeError', handleRouteChangeError)
			window.removeEventListener('unhandledrejection', handleUnhandledRejection)
			window.removeEventListener('error', handleError)
		}
	}, [])

	// Scroll restoration for complete route changes (not shallow)
	useEffect(() => {
		const handleRouteChange = (url: string, { shallow }: { shallow: boolean }) => {
			// Only restore scroll for complete route changes, not shallow ones
			if (!shallow && typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' })
			}
		}

		Router.events.on('routeChangeComplete', handleRouteChange)

		return () => {
			Router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [])

	const { hasActiveSubscription } = useAuthContext()
	const showFloatingButton =
		hasActiveSubscription && !router.pathname.includes('/ai/chat') && !router.pathname.includes('/superluminal')

	return (
		<>
			<Head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
			</Head>
			<Script
				src="/script2.js"
				strategy="afterInteractive"
				data-website-id="ca346731-f7ec-437f-9727-162f29bb67ae"
				data-host-url="https://tasty.defillama.com"
			/>
			<UmamiIdentityTracker />

			{showFloatingButton ? <LlamaAIFloatingButton /> : null}

			<Component {...pageProps} />
		</>
	)
}

const AppWrapper = (props: AppProps) => {
	return (
		<>
			<QueryClientProvider client={client}>
				<AuthProvider>
					<UserSettingsSync />
					<App {...props} />
				</AuthProvider>
				<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
			</QueryClientProvider>
		</>
	)
}

export default AppWrapper
